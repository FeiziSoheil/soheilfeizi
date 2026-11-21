import { ImageResponse } from 'next/og';

export const alt = 'Soheil Feizi — Everything is made of particles';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const dots: Array<{ x: number; y: number; r: number; accent: boolean }> = [];
  for (let i = 0; i < 120; i++) {
    const angle = i * 2.39996;
    const radius = Math.sqrt(i) * 18;
    const x = 920 + Math.cos(angle) * radius;
    const y = 315 + Math.sin(angle) * radius * 0.92;
    if (x > 660 && x < 1160 && y > 60 && y < 570) {
      dots.push({
        x,
        y,
        r: i % 5 === 0 ? 4.5 : 2.6,
        accent: i % 10 === 0,
      });
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#ECEBE7',
          color: '#141414',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Stipple cluster on the right */}
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {dots.map((d, idx) => (
            <circle
              key={idx}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={d.accent ? '#5B5BF0' : '#141414'}
              opacity={d.accent ? 0.95 : 0.72}
            />
          ))}
        </svg>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '20px',
            letterSpacing: '0.08em',
            color: '#141414',
            opacity: 0.7,
          }}
        >
          <span>SOHEIL FEIZI</span>
          <span>·</span>
          <span>TEHRAN / WORLDWIDE</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '640px',
            gap: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '72px',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-0.04em',
              color: '#141414',
            }}
          >
            <span>Everything is</span>
            <span style={{ color: '#5B5BF0' }}>made of particles.</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '26px',
              fontWeight: 400,
              color: '#141414',
              opacity: 0.75,
            }}
          >
            Systems and stores you never have to think about.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(20,20,20,0.18)',
            paddingTop: '24px',
            fontSize: '18px',
            color: '#141414',
            opacity: 0.65,
          }}
        >
          <span>Full-Stack &amp; Creative Systems Engineer</span>
          <span>FA / EN · WebGL Stipple Edition</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
