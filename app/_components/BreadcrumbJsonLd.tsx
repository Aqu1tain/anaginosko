const SITE = "https://anaginosko.fr";

// JSON-LD BreadcrumbList, à monter à côté du fil d'Ariane visuel (<Breadcrumb>)
// pour que les données structurées reflètent le contenu affiché. `path` est un
// chemin relatif ; on l'absolutise. Le dernier élément (page courante) peut être
// sans `path`.
export default function BreadcrumbJsonLd({ items }: { items: { name: string; path?: string }[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: `${SITE}${it.path}` } : {}),
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
