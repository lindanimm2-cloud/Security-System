import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          position: 'relative',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 160,
            height: 90,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,107,0.95) 0%, rgba(239,68,68,0.4) 45%, transparent 72%)',
          }}
        />
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 28,
            background: 'linear-gradient(155deg, #f87171 0%, #dc2626 42%, #450a0a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(239,68,68,0.65), 0 0 80px rgba(220,38,38,0.25), inset 0 2px 0 rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.14)',
          }}
        >
          <span style={{ color: '#ffffff', fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>4DS</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
