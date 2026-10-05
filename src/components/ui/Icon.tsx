/** Small line icons used across the site (24px grid, 1.8 stroke). */
const P: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>,
  cart: <><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  gift: <><rect x="3.5" y="8.5" width="17" height="12" rx="2" /><path d="M12 8.5v12M3.5 12.5h17M12 8.5c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3" /></>,
  people: <><circle cx="9" cy="8.5" r="3.3" /><path d="M2.5 19.5c.9-3.1 3.4-5 6.5-5s5.6 1.9 6.5 5" /><circle cx="17" cy="9.5" r="2.6" /><path d="M16 14.6c2.8-.2 4.8 1.3 5.5 4.4" /></>,
  tools: <path d="M14.5 6.5a4 4 0 0 0 5 5l-8.5 8.5a2.1 2.1 0 0 1-3-3zM9 7 6 4 3.5 6.5l3 3M7.5 8.5l2 2" />,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  split: <path d="M6 3v6a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6v0M18 3v4M6 21v-4" />,
  share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" /></>,
  ticket: <path d="M3.5 8a2 2 0 0 0 0 4v4.5a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5V12a2 2 0 0 1 0-4V5.5A1.5 1.5 0 0 0 19 4H5a1.5 1.5 0 0 0-1.5 1.5zM14 4v14" />,
  megaphone: <path d="M3.5 10v4a1 1 0 0 0 1 1h2l6 4V5l-6 4h-2a1 1 0 0 0-1 1zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />,
  chat: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
  shield: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6zM8.5 12l2.5 2.5 4.5-4.5" />,
  truck: <><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  whatsapp: <path d="M4 20l1.2-3.6A8 8 0 1 1 8 19zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.4-2-1-1 1c-1.2-.6-2.2-1.6-2.8-2.8l1-1-1-2L9.5 7z" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  options: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />,
};

export function Icon({ name, size = 22, className = "", stroke = 1.8 }: { name: keyof typeof P | string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {P[name] ?? P.sun}
    </svg>
  );
}
