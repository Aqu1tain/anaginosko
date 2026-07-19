import Link from "next/link";

type Source = { title: string; body: React.ReactNode };

const sources: Source[] = [
  {
    title: "Texte grec",
    body: (
      <>
        <strong>Nouveau Testament :</strong> SBL Greek New Testament, éd. Michael W. Holmes,
        Society of Biblical Literature et Logos Bible Software, sous{" "}
        <a className="link" href="https://sblgnt.com/license/" target="_blank" rel="noreferrer">
          licence CC BY 4.0
        </a>
        . La mise en forme et l’indexation réalisées par Anaginosko constituent des modifications.
        <br />
        <strong>Septante :</strong> texte de Rahlfs (1935), via{" "}
        <a className="link" href="https://github.com/eliranwong/LXX-Rahlfs-1935" target="_blank" rel="noreferrer">
          LXX-Rahlfs-1935, © 2017 Eliran Wong
        </a>
        , sous{" "}
        <a className="link" href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr" target="_blank" rel="noreferrer">
          CC BY-NC-SA 4.0
        </a>
        . Anaginosko convertit, normalise, corrige et indexe ces données pour un usage non commercial.
      </>
    ),
  },
  {
    title: "Lemmes et morphologie",
    body: (
      <>
        <strong>NT :</strong>{" "}
        <a className="link" href="https://github.com/morphgnt/sblgnt" target="_blank" rel="noreferrer">
          MorphGNT: SBLGNT Edition, version 6.12
        </a>
        , James K. Tauber éd. (2017), DOI 10.5281/zenodo.376200. L’analyse morphologique et
        la lemmatisation sont sous CC BY-SA 3.0 ; le texte grec conserve sa licence CC BY 4.0.
        <br />
        <strong>LXX :</strong> morphologie et corrections provenant du même jeu LXX-Rahlfs-1935,
        sous CC BY-NC-SA 4.0 ; transformations Anaginosko signalées ci-dessus.
      </>
    ),
  },
  {
    title: "Traductions françaises",
    body: (
      <>
        <strong>NT :</strong> Sainte Bible néo-Crampon Libre, modernisation © 2022 Fraternité de
        Tibériade, sous{" "}
        <a className="link" href="https://ebible.org/francl/copyright.htm" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        , obtenue via Free Use Bible API. La conversion en données structurées et les éventuelles
        corrections techniques sont des modifications d’Anaginosko et ne sont pas approuvées par le
        concédant d’origine.
        <br />
        <strong>LXX — Giguet :</strong> Pierre Giguet,{" "}
        <em>La Sainte Bible d’après les Septante</em> (1872), œuvre du domaine public ; transcription{" "}
        <a className="link" href="https://fr.wikisource.org/wiki/Traduction_de_la_Septante_et_du_Nouveau_Testament" target="_blank" rel="noreferrer">
          Wikisource
        </a>{" "}
        sous CC BY-SA 4.0. Anaginosko a retiré des notes, normalisé, extrait et réaligné la
        transcription ; cette adaptation est distribuée sous CC BY-SA 4.0.
        <br />
        <strong>LXX — traductions Anaginosko :</strong> certains versets absents de Giguet sont
        identifiés dans le lecteur comme « traduction Anaginosko ». © 2026 Corentin Renard et Noah
        Jaubert — Anaginosko. Tous droits réservés. Toute reproduction, adaptation, publication ou
        réutilisation nécessite une autorisation écrite préalable à{" "}
        <a className="link" href="mailto:contact@corentinrenard.com">contact@corentinrenard.com</a>.
      </>
    ),
  },
  {
    title: "Définitions (gloses)",
    body: (
      <>
        <strong>Bailly 2020 Hugo Chávez</strong>, Gérard Gréco, André Charbonnet, Mark De Wilde,
        Bernard Maréchal et al., données du 28 février 2023, via{" "}
        <a className="link" href="https://bailly.app/%C3%A0-propos" target="_blank" rel="noreferrer">
          Bailly.app
        </a>
        , sous CC BY-NC-ND 4.0. Les extraits sont reproduits sans modification dans un cadre non
        commercial.
      </>
    ),
  },
  {
    title: "Prononciation et audio",
    body: (
      <>
        Modèles de prononciation inspirés notamment du cours « Introduction au grec biblique » de
        Biblion. Fichiers audio produits avec les voix neuronales Microsoft Azure Speech ; leur
        utilisation reste soumise aux conditions applicables au service Azure utilisé.
      </>
    ),
  },
  {
    title: "Polices",
    body: (
      <>
        Gentium Plus, Inter et Syne sont distribuées sous SIL Open Font License 1.1. Les avis et le
        texte de licence sont reproduits dans le dépôt, dans{" "}
        <a className="link" href="https://github.com/Aqu1tain/anaginosko/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">
          les avis de tiers
        </a>.
      </>
    ),
  },
];

export default function MentionsView() {
  return (
    <div className="pt-6 pb-4">
      <h1 className="text-2xl font-bold">Mentions légales et licences</h1>

      <section className="mt-5 rounded-box border border-base-300 bg-base-100 px-4 py-3">
        <h2 className="text-sm font-semibold">Édition et hébergement</h2>
        <div className="mt-1 max-w-prose space-y-2 text-sm leading-relaxed text-base-content/75">
          <p>
            Anaginosko est un site personnel édité à titre non professionnel par{" "}
            <strong>Corentin Renard</strong>, directeur de la publication. Contact :{" "}
            <a className="link" href="mailto:contact@corentinrenard.com">contact@corentinrenard.com</a>.
            L’hébergeur détient les coordonnées complètes de l’éditeur.
          </p>
          <p>
            Hébergement : <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France,
            téléphone : 1007 depuis la France.
          </p>
        </div>
      </section>

      <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-base-content/70">
        Anaginosko est un projet pédagogique catholique, non commercial et libre d’accès. « Libre
        d’accès » ne signifie pas que tous ses contenus sont libres de droits : chaque composant
        conserve le régime indiqué ci-dessous.
      </p>

      <dl className="mt-5 grid gap-3">
        {sources.map((source) => (
          <div key={source.title} className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
            <dt className="text-sm font-semibold">{source.title}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-base-content/75">{source.body}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-5 rounded-box border border-base-300 bg-base-100 px-4 py-3">
        <h2 className="text-sm font-semibold">Code, interface et contributions originales</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-base-content/75">
          © 2026 Corentin Renard, tous droits réservés pour le code et l’interface, sous réserve des
          composants tiers. Les traductions Anaginosko suivent le régime spécifique décrit
          ci-dessus. Voir le{" "}
          <a className="link" href="https://github.com/Aqu1tain/anaginosko/blob/main/LICENSE" target="_blank" rel="noreferrer">LICENSE</a>{" "}
          et le{" "}
          <a className="link" href="https://github.com/Aqu1tain/anaginosko/blob/main/DATA-LICENSES.md" target="_blank" rel="noreferrer">registre des données</a>.
        </p>
      </section>

      <p className="mt-5 max-w-prose text-xs leading-relaxed text-base-content/70">
        La collecte de données et la mesure d’audience sont détaillées dans la{" "}
        <Link className="link" href="/confidentialite">politique de confidentialité</Link>. Pour une
        demande de droit, de licence ou de retrait :{" "}
        <a className="link" href="mailto:contact@corentinrenard.com">contact@corentinrenard.com</a>.
      </p>
    </div>
  );
}
