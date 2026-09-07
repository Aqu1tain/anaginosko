export const IS_PREPROD = process.env.NEXT_PUBLIC_PREPROD === "1";

export default function PreprodBadge() {
  if (!IS_PREPROD) return null;

  return (
    <span
      className="badge badge-warning h-4 min-h-4 px-1.5 font-sans text-[9px] font-extrabold leading-none tracking-[0.12em]"
      aria-label="Environnement NEXT"
    >
      NEXT
    </span>
  );
}
