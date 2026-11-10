const PATHS = { left: "m15 18-6-6 6-6", right: "m9 18 6-6-6-6" };

export default function Chevron({ to }: { to: "left" | "right" }) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block shrink-0 align-[-0.125em]"
    >
      <path d={PATHS[to]} />
    </svg>
  );
}
