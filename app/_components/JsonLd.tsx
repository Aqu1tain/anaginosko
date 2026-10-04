// JSON.stringify n'échappe pas « < » : un « </script> » dans une donnée saisie (bio,
// titre d'article) fermerait la balise et injecterait du HTML dans la page.
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
