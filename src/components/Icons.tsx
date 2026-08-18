import { asset } from '../lib/asset';

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

export const Search = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="9.8" cy="9.8" r="6.3" stroke={color} strokeWidth="1.5" />
    <path d="M14.6 14.6 19 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Catalog tab: magnifying glass + list lines, as on the ЗЯ tab bar. */
export const SearchList = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="11" r="5.4" stroke={color} strokeWidth="1.6" />
    <path d="M13 15.1 16.4 18.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16.6 8.2h6.2M16.6 11.4h6.2M16.6 14.6h4.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Catalog = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3 6.5h16M3 11h16M3 15.5h16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="7.5" cy="6.5" r="2" fill="#fff" stroke={color} strokeWidth="1.6" />
    <circle cx="14" cy="15.5" r="2" fill="#fff" stroke={color} strokeWidth="1.6" />
  </svg>
);

/** Center tab — official Золотое Яблоко mark from the attached brand logo. */
export const AppleMark = ({ size = 24, color = '#000' }: P) => (
  <span
    className="apple-mark"
    style={{
      width: size,
      height: size,
      display: 'block',
      backgroundColor: color,
      WebkitMaskImage: `url(${asset('gold-apple-mark.png')})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url(${asset('gold-apple-mark.png')})`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

export const Person = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="1.6" />
    <circle cx="12" cy="10" r="3.1" stroke={color} strokeWidth="1.6" />
    <path d="M6.4 18.6c1.5-2.6 3.4-3.8 5.6-3.8s4.1 1.2 5.6 3.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
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
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.0051 10.4442C13.6376 11.2053 13.1692 11.9759 12.5726 12.5725C11.976 13.1691 11.2054 13.6375 10.4443 14.005C11.2054 14.3725 11.976 14.8408 12.5726 15.4374C13.169 16.0338 13.6374 16.8033 14.0051 17.5631C14.3727 16.8033 14.8412 16.0338 15.4375 15.4374C16.0339 14.8411 16.8034 14.3726 17.5632 14.005C16.8034 13.6373 16.0339 13.1688 15.4375 12.5725C14.8409 11.9759 14.3726 11.2053 14.0051 10.4442ZM13.059 7.9815C12.6248 9.2619 12.0394 10.56 11.2998 11.2997C10.5601 12.0393 9.26199 12.6246 7.98156 13.0589C7.82697 13.1113 7.67264 13.1615 7.51958 13.2096C7.18082 13.3159 6.8483 13.4114 6.533 13.4963C6.44944 13.5188 6.36708 13.5405 6.28614 13.5615C5.90483 13.6603 5.90483 14.3496 6.28614 14.4484C6.36708 14.4694 6.44944 14.4912 6.53301 14.5136C6.8483 14.5985 7.18083 14.694 7.51958 14.8003C7.67264 14.8484 7.82697 14.8986 7.98156 14.951C9.26199 15.3853 10.5601 15.9706 11.2998 16.7102C12.0393 17.4497 12.6245 18.7442 13.0587 20.0204C13.1109 20.1738 13.1609 20.3269 13.2088 20.4788C13.3153 20.8172 13.4111 21.1493 13.4961 21.4642C13.5188 21.548 13.5407 21.6307 13.5618 21.7119C13.6609 22.0928 14.3492 22.0928 14.4483 21.7119C14.4695 21.6307 14.4913 21.548 14.514 21.4642C14.599 21.1493 14.6948 20.8172 14.8014 20.4788C14.8492 20.3269 14.8992 20.1738 14.9514 20.0204C15.3856 18.7442 15.9708 17.4497 16.7103 16.7102C17.4498 15.9707 18.7443 15.3855 20.0205 14.9513C20.1739 14.8991 20.327 14.8491 20.4789 14.8013C20.8173 14.6947 21.1494 14.5989 21.4643 14.5139C21.5481 14.4912 21.6308 14.4694 21.712 14.4482C22.093 14.3491 22.093 13.6608 21.712 13.5617C21.6308 13.5406 21.5481 13.5187 21.4643 13.496C21.1494 13.411 20.8173 13.3152 20.4789 13.2087C20.327 13.1608 20.1739 13.1108 20.0205 13.0586C18.7443 12.6244 17.4498 12.0392 16.7103 11.2997C15.9707 10.56 15.3854 9.2619 14.9511 7.9815C14.8987 7.82691 14.8485 7.6726 14.8004 7.51954C14.6941 7.18079 14.5986 6.84826 14.5138 6.53297C14.4913 6.4494 14.4695 6.36704 14.4485 6.2861C14.3497 5.9048 13.6605 5.9048 13.5616 6.2861C13.5406 6.36704 13.5189 6.4494 13.4964 6.53297C13.4115 6.84826 13.316 7.18079 13.2097 7.51954C13.1617 7.6726 13.1114 7.82691 13.059 7.9815Z"
      fill={color}
    />
    <path
      d="M6.42589 2.31759C6.28306 1.88909 5.67696 1.88909 5.53413 2.31759L5.01461 3.87613C4.83545 4.41362 4.41368 4.83539 3.87619 5.01455L2.31765 5.53407C1.88915 5.6769 1.88915 6.28299 2.31765 6.42583L3.87197 6.94393C4.41183 7.12389 4.83481 7.54854 5.01263 8.08911L5.53354 9.6727C5.67527 10.1036 6.28475 10.1036 6.42647 9.6727L6.94599 8.09335C7.1246 7.55039 7.55045 7.12454 8.09341 6.94593L9.67276 6.42641C10.1036 6.28469 10.1036 5.67521 9.67276 5.53348L8.08917 5.01256C7.5486 4.83474 7.12395 4.41177 6.94399 3.87191L6.42589 2.31759Z"
      fill={color}
    />
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

export const Plus = ({ size = 16, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M9 3.5v11M3.5 9h11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const Minus = ({ size = 16, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M3.5 9h11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CheckCircle = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="11" fill={color} />
    <path d="M6.6 11.3 9.6 14.2 15.4 8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Trash = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M4.5 6h13M9 6V4.4A1 1 0 0 1 10 3.4h2a1 1 0 0 1 1 1V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6.4 6l.8 11.4a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L15.6 6" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const Sliders = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3 7h16M3 15h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="7" r="2.4" fill="#fff" stroke={color} strokeWidth="1.5" />
    <circle cx="14" cy="15" r="2.4" fill="#fff" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const Sort = ({ size = 24, color = '#000' }: P) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M7 4.5v13M7 4.5 4.5 7M7 4.5 9.5 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 17.5V4.5M15 17.5 12.5 15M15 17.5 17.5 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Scan = ({ size = 24, color = '#000' }: P) => (
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
  width = 48,
  height = 32,
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
    <img src={asset('ai-tag.svg')} width={width} height={height} alt="" draggable={false} />
  );

export const TickOk = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
    <circle cx="9" cy="9" r="9" fill="var(--ai-green)" />
    <path
      d="M5.1 9.15 7.7 11.7 12.9 6.4"
      stroke="#16350c"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TickWarn = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
    <circle cx="9" cy="9" r="9" fill="#ffcf4a" />
    <path d="M9 5.1v5.4" stroke="#6b4c00" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="9" cy="12.9" r="1.05" fill="#6b4c00" />
  </svg>
);

export const StarRating = ({ size = 16, color = '#2a2a2a' }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M10 2.4 12.2 7l5.2.8-3.8 3.6.9 5.2L10 14.3 5.5 16.6l.9-5.2L2.6 7.8 7.8 7 10 2.4Z"
      fill={color}
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusBadge = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
    <circle cx="9" cy="9" r="8.25" fill="#e7f5e3" />
    <path d="M9 5.2v7.6M5.2 9h7.6" stroke="#2f7a12" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const MinusBadge = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
    <circle cx="9" cy="9" r="8.25" fill="#f8e6e6" />
    <path d="M5.2 9h7.6" stroke="#b03a3a" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
