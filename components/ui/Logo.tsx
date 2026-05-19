// Stratège brand mark — two ascending chevrons.
// Reads as progress / direction / strategy. No box, no letter — distinct.

export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 15 L16 5 L27 15"
        stroke="#0F8A60"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 25 L16 15 L27 25"
        stroke="#0F8A60"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.38"
      />
    </svg>
  );
}

export default function Logo({
  size = 28,
  textClass = "font-display text-xl text-text-primary",
}: {
  size?: number;
  textClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={textClass}>Stratège</span>
    </span>
  );
}
