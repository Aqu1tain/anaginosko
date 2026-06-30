type Source = {
  title: string;
  body: React.ReactNode;
};

const sources: Source[] = [
  {
    title: "Texte grec",
    body: (
      <>
        <strong>Nouveau Testament :</strong> SBLGNT, The Greek New Testament, éd. Michael W. Holmes
        (Society of Biblical Literature & Logos Bible Software), selon la licence SBLGNT.
        <br />
        <strong>Septante :</strong> texte de Rahlfs (1935), via{" "}
        <a className="link" href="https://github.com/eliranwong/LXX-Rahlfs-1935" target="_blank" rel="noreferrer">
          eliranwong/LXX-Rahlfs-1935
        </a>
        , licence CC BY-NC-SA 4.0 (données CCAT/TLG).
      </>
    ),
  },
  {
    title: "Versets, lemmes et nature des mots",
    body: (
      <>
        <strong>NT :</strong> MorphGNT / SBLGNT (analyse morphologique), CC BY-SA 3.0 ·{" "}
        <a className="link" href="https://github.com/morphgnt/sblgnt" target="_blank" rel="noreferrer">
          github.com/morphgnt/sblgnt
        </a>
        .
        <br />
        <strong>LXX :</strong> morphologie CCAT, corrigée par James Tauber, via le dépôt
        eliranwong/LXX-Rahlfs-1935 (CC BY-NC-SA 4.0).
      </>
    ),
  },
  {
    title: "Traduction française",
    body: (
      <>
        <strong>NT :</strong> Bible Crampon (« néo-Crampon libre »), domaine public, via{" "}
        <a className="link" href="https://bible.helloao.org" target="_blank" rel="noreferrer">
          Free Use Bible API
        </a>
        .
        <br />
        <strong>LXX :</strong> Pierre Giguet, <em>La Sainte Bible d'après les Septante</em> (1872),
        domaine public, transcription{" "}
        <a className="link" href="https://fr.wikisource.org/wiki/Traduction_de_la_Septante_et_du_Nouveau_Testament" target="_blank" rel="noreferrer">
          Wikisource
        </a>{" "}
        (CC BY-SA).
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
        </a>
        , licence <strong>CC BY-NC-ND 4.0</strong>. Extraits reproduits sans modification, dans un
        cadre strictement non commercial.
      </>
    ),
  },
  {
    title: "Prononciation",
    body: (
      <>
        D'après le cours « Introduction au grec biblique » de <strong>Biblion</strong> (prononciation
        érasmienne et restituée).
      </>
    ),
  },
  {
    title: "Audio",
    body: (
      <>
        Voix de synthèse <strong>Microsoft Azure Speech</strong> (neuronales), pilotées en alphabet
        phonétique international ; fichiers pré-générés. érasmien : voix fr-FR ; restituée : voix
        el-GR.
      </>
    ),
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
        Anaginosko est un projet <strong>pédagogique</strong> et <strong>catholique</strong>, non
        commercial et <strong>libre d'accès</strong>, pour lire la Bible dans sa langue
        originale. Il s'appuie sur des ressources ouvertes, créditées ci-dessous.
      </p>

      <dl className="mt-5 grid gap-3">
        {sources.map((s) => (
          <div key={s.title} className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
            <dt className="text-sm font-semibold">{s.title}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-base-content/75">{s.body}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 max-w-prose text-xs leading-relaxed text-base-content/70">
        © 2026{" "}
        <a className="link" href="https://corentinrenard.com" target="_blank" rel="noreferrer">
          <strong>Corentin RENARD</strong>
        </a>
        , tous droits réservés (code et interface). Les
        annotations et notes philologiques sont la propriété intellectuelle de{" "}
        <strong>Biblion (Noah Jaubert)</strong>. Les marques et œuvres tierces citées restent la
        propriété de leurs auteurs respectifs.
      </p>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-base-content/70">
        Pour toute question ou demande de retrait, ouvrez une issue sur{" "}
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
