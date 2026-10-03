import React from 'react';

function CareerRadarChart({ scores = {}, title = 'Career Aptitude Radar Profile' }) {
  const entries = Object.entries(scores);

  // If fewer than 3 categories provided, provide standard balanced RIASEC dimensions
  const data = entries.length >= 3
    ? entries
    : [
        ['Technical & Computing', 85],
        ['Analytical Reasoning', 78],
        ['Creative & Design', 62],
        ['Business & Management', 55],
        ['Social & Communication', 68],
        ['Practical & Scientific', 74],
      ];

  const categories = data.map(([cat]) => cat);
  const rawValues = data.map(([, val]) => Number(val) || 0);
  const maxVal = Math.max(...rawValues, 10);

  const size = 440;
  const center = size / 2;
  const radius = 135;
  const totalAxes = categories.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Levels for concentric background polygons (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index, valueRatio) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = radius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate path string for a level ring
  const getLevelPolygon = (ratio) => {
    return categories
      .map((_, i) => {
        const { x, y } = getCoordinates(i, ratio);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Generate data polygon points
  const dataPoints = categories.map((_, i) => {
    const ratio = Math.min(1, Math.max(0.1, rawValues[i] / maxVal));
    return getCoordinates(i, ratio);
  });

  const dataPolygonString = dataPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="career-radar-container" style={{ margin: '20px auto', maxWidth: '520px', textAlign: 'center' }}>
      {title && (
        <h3 style={{ fontSize: '1.08rem', fontWeight: 600, color: 'var(--text, #2C2016)', marginBottom: '8px' }}>
          {title}
        </h3>
      )}
      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #7A6555)', margin: '0 auto 14px', maxWidth: '420px' }}>
        Explainable AI (XAI) multi-axis representation of your assessed aptitude dimensions.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: '100%', maxWidth: `${size}px`, height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C17B3F" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C17B3F" stopOpacity="0.15" />
            </radialGradient>
            <filter id="radarShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#9E5F28" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Concentric grid polygons */}
          {levels.map((level, lvlIdx) => (
            <polygon
              key={lvlIdx}
              points={getLevelPolygon(level)}
              fill={lvlIdx === levels.length - 1 ? 'rgba(247, 239, 231, 0.35)' : 'none'}
              stroke="var(--border, #E0D0BF)"
              strokeWidth="1"
              strokeDasharray={lvlIdx === levels.length - 1 ? 'none' : '3,3'}
            />
          ))}

          {/* Axis lines from center to outer ring */}
          {categories.map((_, i) => {
            const outer = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--border, #E0D0BF)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Data filled polygon */}
          <polygon
            points={dataPolygonString}
            fill="url(#radarGradient)"
            stroke="#C17B3F"
            strokeWidth="2.5"
            filter="url(#radarShadow)"
          />

          {/* Data point circles & values */}
          {dataPoints.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill="#C17B3F"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Axis Labels */}
          {categories.map((cat, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const labelRadius = radius + 28;
            const lx = center + labelRadius * Math.cos(angle);
            const ly = center + labelRadius * Math.sin(angle);
            const scoreVal = rawValues[i];

            // Alignment based on position
            let anchor = 'middle';
            if (Math.cos(angle) > 0.3) anchor = 'start';
            else if (Math.cos(angle) < -0.3) anchor = 'end';

            return (
              <g key={i}>
                <text
                  x={lx}
                  y={ly - 4}
                  textAnchor={anchor}
                  fontSize="11.5"
                  fontWeight="600"
                  fill="var(--text, #2C2016)"
                  style={{ fontFamily: 'inherit' }}
                >
                  {cat}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={anchor}
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#C17B3F"
                  style={{ fontFamily: 'inherit' }}
                >
                  {scoreVal} pts
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default CareerRadarChart;
