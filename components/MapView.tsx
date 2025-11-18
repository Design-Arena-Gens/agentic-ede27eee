"use client";
import { useEffect, useRef } from 'react';
import type { LatLng } from '@/lib/geo';

export default function MapView({ points, current, start, end }: { points: LatLng[]; current: LatLng; start: LatLng; end: LatLng }) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polyRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled) return;
      LRef.current = L;
      // Provide default icon paths to avoid missing marker icons
      const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<?xml version="1.0" ?><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="8" fill="#2c8f7b" stroke="#0b3d4f" stroke-width="3"/></svg>`);
      const icon = L.icon({ iconUrl, iconSize: [24, 24], iconAnchor: [12, 12] });

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: false,
        zoomSnap: 0.25,
        wheelPxPerZoomLevel: 160,
        preferCanvas: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 4,
        maxZoom: 17,
        detectRetina: true,
      }).addTo(map);

      const latlngs = points.map(p => [p.lat, p.lon]) as [number, number][];
      const poly = L.polyline(latlngs, { color: '#2c8f7b', weight: 5, opacity: 0.9 }).addTo(map);
      polyRef.current = poly;

      const m = L.marker([current.lat, current.lon], { icon }).addTo(map);
      markerRef.current = m;

      const group = L.featureGroup([poly, m]);
      map.fitBounds(group.getBounds().pad(0.2));

      // Low-power: throttle map moves
      let lastMove = 0;
      function setMarkerPosition(p: LatLng) {
        m.setLatLng([p.lat, p.lon]);
        const now = Date.now();
        if (now - lastMove > 5000) { // at most once per 5s
          lastMove = now;
          // Keep marker in view softly, without aggressive panning
          if (!map.getBounds().pad(-0.3).contains(m.getLatLng())) {
            map.panTo(m.getLatLng(), { animate: true, duration: 0.5 });
          }
        }
      }
      (window as any).__setMarkerPosition = setMarkerPosition;
    })();
    return () => { cancelled = true; try { mapRef.current?.remove(); } catch {}
    };
  }, [points]);

  // Update marker position
  useEffect(() => {
    const fn = (window as any).__setMarkerPosition as undefined | ((p: LatLng) => void);
    if (fn) fn(current);
  }, [current]);

  return <div ref={containerRef} className="leaflet-container" style={{ position: 'absolute', inset: 0 }} aria-label="Interactive map" />;
}
