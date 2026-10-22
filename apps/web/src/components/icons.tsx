/** Inline stroke icons (decorative unless a label is passed). */
type P = { className?: string; label?: string };

function Svg({ className, label, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-5 w-5'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

export const IconFolder = (p: P) => <Svg {...p}><path d="M3 7h6l2 2h10v10H3z" /></Svg>;
export const IconBoard = (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l5 4 5-3" /></Svg>;
export const IconTimeline = (p: P) => <Svg {...p}><path d="M3 12h18M7 8v8M12 6v12M17 9v6" /></Svg>;
export const IconScales = (p: P) => <Svg {...p}><path d="M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></Svg>;
export const IconBulb = (p: P) => <Svg {...p}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></Svg>;
export const IconPin = (p: P) => <Svg {...p}><path d="M9 4h6l-1 6 3 3H7l3-3z" /><path d="M12 13v8" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>;
export const IconBack = (p: P) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const IconClose = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="M5 12l5 5 9-10" /></Svg>;
export const IconUsers = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.8-3 3-5 6-5s5.2 2 6 5M15 15c3 0 5 1.6 6 4" /></Svg>;
export const IconString = (p: P) => <Svg {...p}><circle cx="5" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M6.5 7.5C10 11 14 13 17.5 16.5" /></Svg>;
export const IconMegaphone = (p: P) => <Svg {...p}><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6" /></Svg>;
export const IconGlobe = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></Svg>;
export const IconCalendar = (p: P) => <Svg {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Svg>;
export const IconWarn = (p: P) => <Svg {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17v.5" /></Svg>;
