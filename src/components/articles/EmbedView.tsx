// Iframe d'intégration, partagé éditeur/public. `src` est déjà validé par
// normalizeEmbedUrl. sandbox restreint les capacités ; allow-same-origin est requis
// par les fournisseurs tiers (YouTube, Maps) et sûr ici car l'origine intégrée n'est
// jamais la nôtre (domaines tiers de la liste blanche).
export default function EmbedView({ src, title }: { src: string; title?: string }) {
  return (
    <div className="my-4 aspect-video w-full overflow-hidden rounded-lg border border-base-300">
      <iframe
        src={src}
        title={title || "Contenu intégré"}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        allowFullScreen
      />
    </div>
  );
}
