type StaticMapProps = {
  variant: 'desktop' | 'mobile';
};

function IsoNode({
  x,
  y,
  s,
  pine = false,
  muted = false
}: {
  x: number;
  y: number;
  s: number;
  pine?: boolean;
  muted?: boolean;
}) {
  const stroke = pine
    ? 'var(--accent)'
    : muted
      ? 'var(--line-strong)'
      : 'var(--line-strong)';
  const top = pine ? 'var(--accent)' : 'var(--surface)';
  const side = pine ? 'var(--accent)' : 'var(--bg)';
  return (
    <g
      stroke={stroke}
      strokeWidth="1"
      fill={top}
      fillOpacity={muted ? 0.75 : pine ? 0.92 : 1}
    >
      <polygon points={`${x},${y - s} ${x + s},${y - s / 2} ${x},${y} ${x - s},${y - s / 2}`} />
      <polygon
        points={`${x - s},${y - s / 2} ${x},${y} ${x},${y + s} ${x - s},${y + s / 2}`}
        fill={side}
        fillOpacity={pine ? 0.72 : 1}
      />
      <polygon
        points={`${x + s},${y - s / 2} ${x},${y} ${x},${y + s} ${x + s},${y + s / 2}`}
        fill={side}
        fillOpacity={pine ? 0.84 : 1}
      />
    </g>
  );
}

const desktopGroups = [
  [72, 105],
  [50, 158],
  [80, 208],
  [608, 105],
  [632, 158],
  [602, 208],
  [608, 258],
  [632, 312],
  [602, 362],
  [72, 258],
  [50, 312],
  [80, 362]
] as const;

export function StaticMap({ variant }: StaticMapProps) {
  if (variant === 'mobile') {
    return (
      <svg
        className="static-map static-map-mobile"
        viewBox="0 0 360 190"
        aria-hidden="true"
        focusable="false"
      >
        <g stroke="var(--line)" fill="none">
          <circle cx="180" cy="95" r="58" opacity=".55" />
          <circle cx="180" cy="95" r="88" opacity=".35" />
        </g>
        <g stroke="var(--line-strong)" fill="none" opacity=".8">
          <path d="M180 95 L70 48 M180 95 L70 143 M180 95 L290 48 M180 95 L290 143" />
          <path d="M70 48 L42 28 M70 48 L38 56 M70 48 L55 78" opacity=".5" />
          <path d="M290 48 L318 28 M290 48 L322 56 M290 48 L305 78" opacity=".5" />
          <path d="M290 143 L318 123 M290 143 L322 151 M290 143 L305 166" opacity=".5" />
          <path d="M70 143 L42 123 M70 143 L38 151 M70 143 L55 166" opacity=".5" />
          <path d="M305 78 L55 166" stroke="var(--accent)" strokeDasharray="3 4" opacity=".8" />
        </g>
        <IsoNode x={42} y={21} s={3.5} muted />
        <IsoNode x={38} y={49} s={3.5} muted />
        <IsoNode x={55} y={71} s={3.5} muted />
        <IsoNode x={318} y={21} s={3.5} muted />
        <IsoNode x={322} y={49} s={3.5} muted />
        <IsoNode x={305} y={71} s={3.5} pine />
        <IsoNode x={318} y={116} s={3.5} muted />
        <IsoNode x={322} y={144} s={3.5} muted />
        <IsoNode x={305} y={159} s={3.5} pine />
        <IsoNode x={42} y={116} s={3.5} muted />
        <IsoNode x={38} y={144} s={3.5} muted />
        <IsoNode x={55} y={159} s={3.5} pine />
        <IsoNode x={70} y={41} s={6} />
        <IsoNode x={290} y={41} s={6} />
        <IsoNode x={290} y={136} s={6} />
        <IsoNode x={70} y={136} s={6} />
        <IsoNode x={180} y={88} s={10} pine />
        <g
          fontFamily="IBM Plex Mono, monospace"
          fontSize="8"
          letterSpacing=".4"
          fill="var(--muted)"
          textAnchor="middle"
        >
          <text x="54" y="14">PLATFORM</text>
          <text x="296" y="14">AGENT SYSTEMS</text>
          <text x="60" y="181">DELIVERY &amp; OPS</text>
          <text x="298" y="181">OBSERVABILITY</text>
          <text x="180" y="118" fill="var(--text)">HAPPY</text>
        </g>
      </svg>
    );
  }

  return (
    <svg
      className="static-map static-map-desktop"
      viewBox="0 0 680 460"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="static-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.9" fill="var(--line)" />
        </pattern>
      </defs>
      <rect width="680" height="460" fill="url(#static-dots)" />

      <g stroke="var(--line)" fill="none">
        <circle cx="340" cy="230" r="100" opacity=".55" />
        <circle cx="340" cy="230" r="155" opacity=".35" />
      </g>

      <g stroke="var(--line-strong)" fill="none" opacity=".8">
        <path d="M340 230 L135 145 L135 315 L340 230" />
        <path d="M340 230 L545 145 L545 315 L340 230" />
        <path d="M135 145 L72 105 M135 145 L50 158 M135 145 L80 208" opacity=".5" />
        <path d="M545 145 L608 105 M545 145 L632 158 M545 145 L602 208" opacity=".5" />
        <path d="M545 315 L608 258 M545 315 L632 312 M545 315 L602 362" opacity=".5" />
        <path d="M135 315 L72 258 M135 315 L50 312 M135 315 L80 362" opacity=".5" />
        <path d="M602 208 L80 362" stroke="var(--accent)" strokeDasharray="4 6" opacity=".85" />
      </g>

      {desktopGroups.map(([x, y], index) => (
        <IsoNode
          key={`${x}-${y}`}
          x={x}
          y={y}
          s={3.5}
          muted
          pine={index === 5 || index === 11}
        />
      ))}
      <IsoNode x={135} y={145} s={11} />
      <IsoNode x={545} y={145} s={11} />
      <IsoNode x={545} y={315} s={11} />
      <IsoNode x={135} y={315} s={11} />
      <IsoNode x={340} y={230} s={19} pine />

      <g
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        letterSpacing=".6"
        fill="var(--muted)"
        textAnchor="middle"
      >
        <text x="340" y="121" opacity=".7">CAPABILITIES</text>
        <text x="340" y="66" opacity=".55">SKILL GROUPS</text>
        <text x="135" y="178">PLATFORM</text>
        <text x="545" y="178">AGENT SYSTEMS</text>
        <text x="545" y="348">OBSERVABILITY</text>
        <text x="135" y="348">DELIVERY &amp; OPS</text>
        <text x="340" y="268" fill="var(--text)" fontSize="10">HAPPY</text>
        <text x="340" y="432" fill="var(--accent)" fontSize="8">
          AGENT CONTROL TOWER ↔ TESTING HARNESS · ARIA OSS
        </text>
      </g>
    </svg>
  );
}
