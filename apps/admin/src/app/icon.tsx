import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 30,
            height: 18,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,107,0.95) 0%, rgba(239,68,68,0.45) 50%, transparent 75%)',
          }}
        />
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(155deg, #f87171 0%, #dc2626 42%, #450a0a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(239,68,68,0.7), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <span style={{ color: '#ffffff', fontSize: 7, fontWeight: 800, letterSpacing: 0.5 }}>4DS</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
