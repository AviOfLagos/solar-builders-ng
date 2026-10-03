export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="7" fill="#FFC21A" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="15" y="1.5" width="2" height="5" rx="1" fill="#FFC21A" transform={`rotate(${i * 45} 16 16)`} />
        ))}
        <rect x="11.5" y="13" width="9" height="6" rx="1" fill="#10213B" />
        <rect x="20.5" y="14.8" width="1.4" height="2.4" rx=".5" fill="#10213B" />
      </svg>
      <span className="font-display text-[1.15rem] font-bold tracking-tight">Solar Builders<span className="text-sun-deep">.ng</span></span>
    </span>
  );
}
