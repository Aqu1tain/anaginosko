import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc, { Mail, type LegalSection } from "@/app/_components/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conditions d’utilisation",
  description: "Conditions d’utilisation d’Anaginosko : accès au site, comptes, cours, contributions et responsabilités.",
  path: "/conditions",
});

const SECTIONS: LegalSection[] = [
  {
    id: "objet",
    title: "Objet",
    body: (
      <p>
        Anaginosko est un service gratuit de lecture et d’étude de la Bible en grec. Ces conditions encadrent l’usage du
        site, des comptes et des cours. Utiliser le site ou créer un compte vaut acceptation.
      </p>
    ),
  },
  {
    id: "acces",
    title: "Accès",
    body: (
      <p>
        Les textes, la concordance, l’alphabet, la prononciation et les articles sont accessibles sans compte. Les
        leçons et le suivi de progression demandent un compte gratuit. Le service peut être interrompu pour maintenance
        ou évoluer sans préavis.
      </p>
    ),
  },
  {
    id: "compte",
    title: "Compte",
    body: (
      <p>
        Le compte est personnel. La connexion se fait par un code envoyé à votre adresse e-mail ou par Google ; vous
        êtes responsable de l’accès à cette adresse. Vous pouvez supprimer votre compte à tout moment depuis « Mon
        compte ». Un compte utilisé pour nuire au service ou à autrui peut être suspendu.
      </p>
    ),
  },
  {
    id: "communications",
    title: "Communications",
    body: (
      <p>
        La lettre d’information et les avis de nouvel article ne sont envoyés qu’avec votre accord, donné à
        l’inscription ou dans « Mon compte ». Chaque message contient un lien de désinscription.
      </p>
    ),
  },
  {
    id: "usage",
    title: "Usage acceptable",
    body: (
      <p>
        Il est interdit de perturber le service (extraction massive automatisée, contournement des limites, tentative
        d’intrusion) et d’utiliser les signalements à d’autres fins que l’amélioration du corpus.
      </p>
    ),
  },
  {
    id: "contenus",
    title: "Contenus et licences",
    body: (
      <p>
        Les textes grecs, traductions, dictionnaire et données linguistiques relèvent de leurs licences, détaillées dans
        les <Link href="/mentions" className="link">mentions légales</Link>. Les cours, articles et traductions
        Anaginosko restent la propriété de leurs auteurs ; leur reproduction demande une autorisation.
      </p>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    body: (
      <p>
        Les contenus sont préparés avec soin, sans garantie d’exactitude ni d’exhaustivité. Ils ne remplacent ni un
        enseignement ni une édition critique. Anaginosko ne saurait être tenu responsable de l’usage qui en est fait.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    body: (
      <p>
        Voir la <Link href="/confidentialite" className="link">politique de confidentialité</Link>.
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modifications et droit applicable",
    body: (
      <p>
        Ces conditions peuvent évoluer ; la date en tête de page fait foi. Elles sont soumises au droit français.
        Contact : <Mail />.
      </p>
    ),
  },
];

export default function TermsPage() {
  return <LegalDoc path="/conditions" title="Conditions d’utilisation" updated="15 octobre 2026" sections={SECTIONS} />;
}
