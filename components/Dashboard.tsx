"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ROUTE_STATIONS, ROUTE_FACTS } from '@/lib/route';
import { clamp, haversineKm, polylineDistanceKm, interpolateAlongPolyline } from '@/lib/geo';
import { formatDuration, formatISTTime, nowInIST } from '@/lib/time';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const DEFAULT_SPEED_KMPH = 65; // average speed assumption

function useRotatingFact(intervalMs = 15000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % ROUTE_FACTS.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return ROUTE_FACTS[index];
}

function computeJourney() {
  const points = ROUTE_STATIONS.map(s => ({ lat: s.lat, lon: s.lon }));
  const totalKm = polylineDistanceKm(points);
  return { points, totalKm };
}

export default function Dashboard() {
  const { points, totalKm } = useMemo(computeJourney, []);
  const [speedKmph, setSpeedKmph] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SPEED_KMPH;
    const url = new URL(window.location.href);
    const s = url.searchParams.get('speed');
    return s ? Math.max(10, Math.min(120, Number(s))) : DEFAULT_SPEED_KMPH;
  });

  // Assume departure today at 06:00 IST
  const departure = useMemo(() => {
    const d = nowInIST();
    d.setHours(6, 0, 0, 0);
    return d;
  }, []);

  const [now, setNow] = useState<Date>(() => nowInIST());
  useEffect(() => {
    const id = setInterval(() => setNow(nowInIST()), 15000); // low power: update every 15s
    return () => clearInterval(id);
  }, []);

  const elapsedHours = Math.max(0, (now.getTime() - departure.getTime()) / 3600000);
  const traveledKm = clamp(elapsedHours * speedKmph, 0, totalKm);
  const remainingKm = clamp(totalKm - traveledKm, 0, totalKm);
  const etaHours = remainingKm / Math.max(1, speedKmph);
  const eta = new Date(now.getTime() + etaHours * 3600000);
  const progressPct = Math.round((traveledKm / totalKm) * 100);

  const { point: currentPoint, segmentIndex } = interpolateAlongPolyline(points, traveledKm);

  const nextStations = useMemo(() => {
    // Find next stations based on segmentIndex
    const idx = Math.min(ROUTE_STATIONS.length - 1, segmentIndex + 1);
    return ROUTE_STATIONS.slice(idx, idx + 4);
  }, [segmentIndex]);

  const fact = useRotatingFact();

  return (
    <div className="container" role="main">
      <section className="mainPanel" aria-label="Primary display">
        <div className="header">
          <div className="headerTitle" aria-live="polite">Delhi ? Patna</div>
          <div className="headerRight">
            <span className="badge" title="Current time (IST)">?? {formatISTTime(now)}</span>
            <button className="btn" onClick={() => {
              const s = prompt('Set simulated speed (km/h):', String(speedKmph));
              if (!s) return;
              const v = Number(s);
              if (!Number.isFinite(v)) return;
              setSpeedKmph(clamp(v, 10, 120));
            }}>Adjust Speed</button>
            <HelpButton />
          </div>
        </div>
        <div className="progressWrap">
          <div className="progress" aria-label="Journey progress" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} role="progressbar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="map" aria-label="Route map">
          <MapView
            points={points}
            current={currentPoint}
            start={points[0]}
            end={points[points.length - 1]}
          />
        </div>
      </section>

      <aside className="sidebar" aria-label="Secondary information">
        <div className="card">
          <h3>Remaining</h3>
          <div className="metrics">
            <div>
              <div className="bigMetric" aria-live="polite">{Math.round(remainingKm)} km</div>
              <div className="small">to Patna Jn</div>
            </div>
            <div>
              <div className="bigMetric" aria-live="polite">ETA {formatISTTime(eta)}</div>
              <div className="small">{formatDuration(etaHours)} remaining</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Upcoming Stations</h3>
          <div className="stationList">
            {nextStations.map((s) => (
              <div className="stationItem" key={s.name}>
                <span>{s.name}</span>
                <span className="small">{Math.round(haversineKm({lat: currentPoint.lat, lon: currentPoint.lon}, {lat: s.lat, lon: s.lon}))} km</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Route Fact</h3>
          <div className="fact" aria-live="polite">{fact}</div>
          <div className="footer small">
            <span>Optimized for readability and low power</span>
            <span>{progressPct}% complete</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
  return (
    <>
      <button className="btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Help</button>
      {open && (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Help" onKeyDown={onKey}>
          <div className="modal">
            <h2 style={{marginTop:0}}>Train Services</h2>
            <ul>
              <li><a href="https://www.irctc.co.in" target="_blank" rel="noreferrer">IRCTC</a> ? bookings and schedules</li>
              <li><a href="https://enquiry.indianrail.gov.in" target="_blank" rel="noreferrer">NTES</a> ? live train status</li>
              <li><a href="https://www.indianrailways.gov.in" target="_blank" rel="noreferrer">Indian Railways</a> ? official site</li>
            </ul>
            <p className="small">Press Esc or click outside to close</p>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="btn" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
