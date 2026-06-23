type Source = {
  title: string;
  body: React.ReactNode;
};

const sources: Source[] = [
  {
    title: "Texte grec",
    body: (
      <>
        <strong>SBLGNT</strong> — The Greek New Testament, éd. Michael W. Holmes, Society of
        Biblical Literature & Logos Bible Software. Utilisé selon la licence SBLGNT.
      </>
    ),
  },
  {
    title: "Versets, lemmes et nature des mots",
    body: (
      <>
        <strong>MorphGNT / SBLGNT</strong> (analyse morphologique), licence CC BY-SA 3.0 —{" "}
        <a className="link" href="https://github.com/morphgnt/sblgnt" target="_blank" rel="noreferrer">
          github.com/morphgnt/sblgnt
        </a>
        .
      </>
    ),
  },
  {
    title: "Traduction française",
    body: (
      <>
        <strong>Bible Crampon</strong> (édition « néo-Crampon libre »), domaine public, via{" "}
        <a className="link" href="https://bible.helloao.org" target="_blank" rel="noreferrer">
          Free Use Bible API
        </a>
        .
      </>
    ),
  },
  {
    title: "Définitions (gloses)",
    body: (
      <>
        <strong>Bailly 2020</strong> (Dictionnaire grec-français, éd. Gérard Gréco et al.), via{" "}
        <a className="link" href="https://bailly.app" target="_blank" rel="noreferrer">
          api.bailly.app
        </a>{" "}
        — licence <strong>CC BY-NC-ND 4.0</strong>. Extraits reproduits sans modification, dans un
        cadre strictement non commercial.
      </>
    ),
  },
  {
    title: "Prononciation",
    body: <>D'après le cours « Introduction au grec biblique » (érasmienne et restituée).</>,
  },
  {
    title: "Polices",
    body: (
      <>
        <strong>Gentium Plus</strong> (grec) et <strong>Inter</strong> (interface), sous SIL Open
        Font License.
      </>
    ),
  },
];

export default function MentionsView() {
  return (
    <div className="pt-6 pb-4">
      <h1 className="text-2xl font-bold">Mentions légales</h1>
      <p className="mt-2 max-w-prose text-[0.95rem] leading-relaxed text-base-content/70">
        Anaginosko est un projet pédagogique <strong>non commercial</strong>, libre d'accès. Il
        s'appuie sur des ressources ouvertes, créditées ci-dessous.
      </p>

      <dl className="mt-5 grid gap-3">
        {sources.map((s) => (
          <div key={s.title} className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
            <dt className="text-sm font-semibold">{s.title}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-base-content/75">{s.body}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 max-w-prose text-xs leading-relaxed text-base-content/55">
        Les marques et œuvres citées restent la propriété de leurs auteurs. Pour toute question ou
        demande de retrait, ouvrez une issue sur{" "}
        <a
          className="link"
          href="https://github.com/Aqu1tain/anaginosko"
          target="_blank"
          rel="noreferrer"
        >
          le dépôt du projet
        </a>
        .
      </p>
    </div>
  );
}
