/** The sun mark on a dark tile (same as the app icon), with the wordmark. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#1D2621" />
        <circle cx="16" cy="16" r="5.5" fill="#BDF0A6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="15.1" y="3.5" width="1.8" height="4" rx=".9" fill="#BDF0A6" transform={`rotate(${i * 45} 16 16)`} />
        ))}
        <rect x="12.6" y="14" width="6.8" height="4.2" rx=".8" fill="#1D2621" />
      </svg>
      <span className="text-[1.08rem] font-bold tracking-tight">Solar Builders<span className="text-sun-deep">.ng</span></span>
    </span>
  );
}
