'use client';

import { useEffect, useState } from 'react';
import type { OrgCamera } from '@/lib/org';

function sceneClass(camera: OrgCamera) {
  return camera.scene ?? camera.group ?? 'entrance';
}

export function CameraFeed({ camera, large = false }: { camera: OrgCamera; large?: boolean }) {
  const offline = camera.status === 'OFFLINE';
  const [clock, setClock] = useState('--:--:--');
  const [recSec, setRecSec] = useState(0);

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setRecSec((n) => (n + 1) % 3600);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(recSec / 60)).padStart(2, '0');
  const ss = String(recSec % 60).padStart(2, '0');

  return (
    <span
      className={`cam-feed cam-feed--${sceneClass(camera)} ${large ? 'cam-feed--large' : ''} ${offline ? 'is-offline' : ''} ${camera.status === 'DEGRADED' ? 'is-degraded' : ''}`}
    >
      <span className="cam-feed__world" aria-hidden>
        <span className="cam-feed__sky" />
        <span className="cam-feed__ground" />
        <span className="cam-feed__structure cam-feed__structure--a" />
        <span className="cam-feed__structure cam-feed__structure--b" />
        <span className="cam-feed__actor cam-feed__actor--1" />
        <span className="cam-feed__actor cam-feed__actor--2" />
        <span className="cam-feed__vehicle" />
      </span>
      <span className="cam-feed__scan" aria-hidden />
      <span className="cam-feed__vignette" aria-hidden />
      <span className={`cam-feed__live ${offline ? 'is-off' : ''}`}>
        {offline ? 'OFFLINE' : camera.status === 'DEGRADED' ? 'DEGRADED' : 'LIVE'}
      </span>
      {!offline && (
        <span className="cam-feed__rec" aria-hidden>
          <i /> REC {mm}:{ss}
        </span>
      )}
      <span className="cam-feed__hud" aria-hidden>
        <span className="cam-feed__badge">HDR</span>
        <span className="cam-feed__badge">1080P · 24FPS</span>
      </span>
      <span className="cam-feed__meta">
        <strong>{camera.name}</strong>
        <em>{camera.location}</em>
      </span>
      <span className="cam-feed__clock">
        {offline ? camera.offlineFor ?? 'No signal' : `${clock} · ${camera.quality}`}
      </span>
      <span className="cam-feed__cross" aria-hidden />
    </span>
  );
}
