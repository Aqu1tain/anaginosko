// Avatar rond d'un profil : photo, ou initiale sur fond teinté. Composant serveur
// et client (purement présentationnel), partagé par les articles, l'accueil et les
// pages profil.
export default function Avatar({ name, photo, size = 40 }: { name: string; photo: string | null; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initial}
    </span>
  );
}
