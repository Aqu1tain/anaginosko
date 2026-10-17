import type { Metadata } from "next";
import LegalDoc, { Ext, Mail, type LegalSection } from "@/app/_components/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Mentions légales",
  description: "Éditeur, hébergeur, sources, droits et licences des contenus d’Anaginosko.",
  path: "/mentions",
});

const GITHUB = "https://github.com/Aqu1tain/anaginosko/blob/main";

const SOURCES: { name: string; body: React.ReactNode }[] = [
  {
    name: "Nouveau Testament grec",
    body: (
      <>
        SBL Greek New Testament, éd. Michael W. Holmes, Society of Biblical Literature et Logos Bible Software,{" "}
        <Ext href="https://sblgnt.com/license/">CC BY 4.0</Ext>. Mise en forme et indexation par Anaginosko.
      </>
    ),
  },
  {
    name: "Septante grecque",
    body: (
      <>
        Rahlfs (1935), via <Ext href="https://github.com/eliranwong/LXX-Rahlfs-1935">LXX-Rahlfs-1935</Ext>, © 2017 Eliran
        Wong, <Ext href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr">CC BY-NC-SA 4.0</Ext>. Converti,
        normalisé, corrigé et indexé par Anaginosko, sans usage commercial.
      </>
    ),
  },
  {
    name: "Lemmes et morphologie",
    body: (
      <>
        NT : <Ext href="https://github.com/morphgnt/sblgnt">MorphGNT, SBLGNT Edition 6.12</Ext>, éd. James K. Tauber
        (2017), DOI 10.5281/zenodo.376200, CC BY-SA 3.0. Septante : même jeu LXX-Rahlfs-1935, CC BY-NC-SA 4.0.
      </>
    ),
  },
  {
    name: "Traduction du Nouveau Testament",
    body: (
      <>
        Sainte Bible néo-Crampon Libre, © 2022 Fraternité de Tibériade,{" "}
        <Ext href="https://ebible.org/francl/copyright.htm">CC BY-SA 4.0</Ext>, via Free Use Bible API. La conversion et
        les corrections techniques sont des modifications d’Anaginosko, non approuvées par le concédant.
      </>
    ),
  },
  {
    name: "Traduction de la Septante",
    body: (
      <>
        Pierre Giguet, <em>La Sainte Bible d’après les Septante</em> (1872), domaine public ; transcription{" "}
        <Ext href="https://fr.wikisource.org/wiki/Traduction_de_la_Septante_et_du_Nouveau_Testament">Wikisource</Ext>,
        CC BY-SA 4.0. Notes retirées, texte normalisé et réaligné ; adaptation distribuée sous CC BY-SA 4.0.
      </>
    ),
  },
  {
    name: "Dictionnaire",
    body: (
      <>
        Bailly 2020 Hugo Chávez, Gérard Gréco, André Charbonnet, Mark De Wilde, Bernard Maréchal et al., données du 28
        février 2023, via <Ext href="https://bailly.app/%C3%A0-propos">Bailly.app</Ext>, CC BY-NC-ND 4.0. Notices
        reproduites sans modification.
      </>
    ),
  },
  {
    name: "Prononciation et audio",
    body: (
      <>
        Modèles inspirés notamment du cours « Introduction au grec biblique » de Biblion. Audio produit avec les voix
        neuronales Microsoft Azure Speech, sous les conditions de ce service.
      </>
    ),
  },
  {
    name: "Polices",
    body: (
      <>
        Gentium Plus, Inter et Syne, SIL Open Font License 1.1. Voir les{" "}
        <Ext href={`${GITHUB}/THIRD_PARTY_NOTICES.md`}>avis de tiers</Ext>.
      </>
    ),
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "editeur",
    title: "Éditeur",
    body: (
      <p>
        Anaginosko est un site personnel édité à titre non professionnel par <strong>Corentin Renard</strong>, directeur
        de la publication. Contact : <Mail />. L’hébergeur détient les coordonnées complètes de l’éditeur.
      </p>
    ),
  },
  {
    id: "hebergement",
    title: "Hébergement",
    body: (
      <p>
        <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France. Téléphone : 1007 depuis la France.
      </p>
    ),
  },
  {
    id: "sources",
    title: "Sources et licences",
    body: (
      <>
        <p>
          Le site est gratuit et non commercial, mais ses contenus ne sont pas tous libres de droits : chaque composant
          garde sa licence.
        </p>
        <dl className="divide-y divide-base-300 border-y border-base-300">
          {SOURCES.map((s) => (
            <div key={s.name} className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-sm font-semibold text-base-content">{s.name}</dt>
              <dd className="text-sm">{s.body}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
  },
  {
    id: "traductions",
    title: "Traductions Anaginosko",
    body: (
      <p>
        Les versets traduits par l’équipe sont signalés comme tels dans le lecteur. © 2026 Corentin Renard et Biblion,
        tous droits réservés. Toute reproduction, adaptation ou réutilisation demande une autorisation écrite préalable :{" "}
        <Mail />.
      </p>
    ),
  },
  {
    id: "code",
    title: "Code et interface",
    body: (
      <p>
        © 2026 Corentin Renard, tous droits réservés, sous réserve des composants tiers. Voir la{" "}
        <Ext href={`${GITHUB}/LICENSE`}>licence</Ext> et le{" "}
        <Ext href={`${GITHUB}/DATA-LICENSES.md`}>registre des données</Ext>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Droits et retrait",
    body: (
      <p>
        Pour une question de droits, une demande de licence ou de retrait : <Mail />.
      </p>
    ),
  },
];

export default function MentionsPage() {
  return <LegalDoc path="/mentions" title="Mentions légales" updated="17 octobre 2026" sections={SECTIONS} />;
}
