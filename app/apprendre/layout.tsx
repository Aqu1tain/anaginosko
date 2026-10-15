// Largeur unique pour toute la partie « Apprendre » : on passe de la liste au cours
// puis à la leçon sans que le contenu change de largeur.
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl">{children}</div>;
}
