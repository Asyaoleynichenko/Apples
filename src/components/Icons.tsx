type P = { size?: number; color?: string; className?: string };

export const ChevronLeft = ({ size = 20, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M12.5 4.5 7 10l5.5 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight = ({ size = 20, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M7.5 4.5 13 10l-5.5 5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDown = ({ size = 20, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M5 7.5 10 13l5-5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Close = ({ size = 16, color = 'rgba(39,43,55,0.3)' }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 3l10 10M13 3L3 13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const SendArrow = ({ size = 20, color = '#fff' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M10 16V5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M5.5 9.5 10 4.8l4.5 4.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Heart = ({ size = 20, color = '#000', filled = false }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path
      d="M10 16.5s-6.2-3.7-6.2-8A3.6 3.6 0 0 1 10 6.2a3.6 3.6 0 0 1 6.2 2.3c0 4.3-6.2 8-6.2 8Z"
      stroke={color}
      strokeWidth="1.4"
      fill={filled ? color : 'none'}
      strokeLinejoin="round"
    />
  </svg>
);

export const Bag = ({ size = 20, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M4.5 6.5h11l-.9 9.2a1 1 0 0 1-1 .9H6.4a1 1 0 0 1-1-.9L4.5 6.5Z" stroke={color} strokeWidth="1.4" />
    <path d="M7.4 8V5.6a2.6 2.6 0 0 1 5.2 0V8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const Search = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="9.8" cy="9.8" r="6.3" stroke={color} strokeWidth="1.5" />
    <path d="M14.6 14.6 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Catalog = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3 6.5h16M3 11h16M3 15.5h16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="7.5" cy="6.5" r="2" fill="#fff" stroke={color} strokeWidth="1.6" />
    <circle cx="14" cy="15.5" r="2" fill="#fff" stroke={color} strokeWidth="1.6" />
  </svg>
);

export const Person = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="8.4" r="3.2" stroke={color} strokeWidth="1.5" />
    <path d="M4.8 18.2a6.4 6.4 0 0 1 12.4 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Share = ({ size = 20, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <path d="M10 13.5V3.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6.3 6.6 10 2.9l3.7 3.7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 11.6v4.2a1.2 1.2 0 0 0 1.2 1.2h8.6a1.2 1.2 0 0 0 1.2-1.2v-4.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Sparkle = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" fill={color} />
    <path d="M18.4 15.4l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" fill={color} />
  </svg>
);

export const Bulb = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9.2 17.2a6 6 0 1 1 5.6 0v1.6a1.4 1.4 0 0 1-1.4 1.4h-2.8a1.4 1.4 0 0 1-1.4-1.4v-1.6Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 21.5h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Doc = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6.5 3.5h7.2L18 7.8v12.7a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M13.4 3.6v4.4H18" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const Layers = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5 21 8.2l-9 4.7-9-4.7 9-4.7Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3.6 12.5 12 16.9l8.4-4.4M3.6 16.6 12 21l8.4-4.4" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const Plus = ({ size = 18, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M9 3.5v11M3.5 9h11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Minus = ({ size = 18, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M3.5 9h11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CheckCircle = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="11" fill={color} />
    <path d="M6.6 11.3 9.6 14.2 15.4 8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Trash = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M4.5 6h13M9 6V4.4A1 1 0 0 1 10 3.4h2a1 1 0 0 1 1 1V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6.4 6l.8 11.4a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L15.6 6" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const Sliders = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3 7h16M3 15h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="7" r="2.4" fill="#fff" stroke={color} strokeWidth="1.5" />
    <circle cx="14" cy="15" r="2.4" fill="#fff" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const Sort = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M7 4.5v13M7 4.5 4.5 7M7 4.5 9.5 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 17.5V4.5M15 17.5 12.5 15M15 17.5 17.5 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Scan = ({ size = 22, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3.5 7.5v-3a1 1 0 0 1 1-1h3M14.5 3.5h3a1 1 0 0 1 1 1v3M18.5 14.5v3a1 1 0 0 1-1 1h-3M7.5 18.5h-3a1 1 0 0 1-1-1v-3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Outline badge is the Figma export (node 154:22149).
 * Filled lime variant is only used on the mascot, not in the shop chrome.
 */
const AI_TAG_PATH =
  'M6.2.95H14.05A2.95 2.95 0 0 1 19.95.95H27.8A5.25 5.25 0 0 1 33.05 6.2' +
  'V14.8A5.25 5.25 0 0 1 27.8 20.05H19.95A2.95 2.95 0 0 1 14.05 20.05H6.2' +
  'A5.25 5.25 0 0 1 .95 14.8V6.2A5.25 5.25 0 0 1 6.2.95Z';

export const AiTag = ({
  width = 32,
  height = 20,
  filled = false,
}: {
  width?: number;
  height?: number;
  filled?: boolean;
}) =>
  filled ? (
    <svg width={width} height={height} viewBox="0 0 34 21" fill="none">
      <path
        d={AI_TAG_PATH}
        fill="var(--ai-green)"
        stroke="#000"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <text
        x="17"
        y="14.4"
        textAnchor="middle"
        fontFamily="var(--font), 'Graphik LCG', -apple-system, sans-serif"
        fontSize="11"
        fontWeight="600"
        fill="#000"
      >
        AI
      </text>
    </svg>
  ) : (
    <img src="/assets/ai-tag.svg" width={width} height={height} alt="" draggable={false} />
  );
