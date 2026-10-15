import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/_components/Breadcrumb";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Conditions d’utilisation",
  description: "Conditions d’utilisation d’Anaginosko : accès au site, comptes, cours, contributions et responsabilités.",
  path: "/conditions",
});

const h2 = "pt-4 text-lg font-bold text-base-content";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Breadcrumb items={[{ label: "Accueil", href: "/", home: true }, { label: "Conditions d’utilisation" }]} />
      <h1 className="text-2xl font-bold">Conditions d’utilisation</h1>
      <p className="mt-1 text-sm text-base-content/60">En vigueur au 15 octobre 2026.</p>

      <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-base-content/85">
        <h2 className={h2}>Objet</h2>
        <p>
          Anaginosko est un service gratuit de lecture et d’étude de la Bible en grec. Ces conditions encadrent
          l’usage du site, des comptes et des cours. Utiliser le site ou créer un compte vaut acceptation de ces conditions.
        </p>

        <h2 className={h2}>Accès</h2>
        <p>
          La lecture des textes, la concordance, l’alphabet, la prononciation et les articles sont accessibles sans
          compte. Les leçons des cours et le suivi de progression demandent un compte gratuit. Le service peut être
          interrompu pour maintenance ou évoluer sans préavis.
        </p>

        <h2 className={h2}>Compte</h2>
        <p>
          Le compte est personnel. La connexion se fait par un code envoyé à votre adresse e-mail ou par Google ;
          vous êtes responsable de l’accès à cette adresse. Vous pouvez supprimer votre compte à tout moment depuis
          « Mon compte ». Un compte utilisé pour nuire au service ou à autrui peut être suspendu.
        </p>

        <h2 className={h2}>Communications</h2>
        <p>
          La lettre d’information et les avis de nouvel article ne sont envoyés qu’avec votre accord, donné à la
          création du compte ou dans « Mon compte ». Chaque message contient un lien de désinscription.
        </p>

        <h2 className={h2}>Usage acceptable</h2>
        <p>
          Il est interdit de perturber le service (extraction massive automatisée, contournement des limites,
          tentative d’intrusion) et d’utiliser les formulaires de signalement à d’autres fins que l’amélioration
          du corpus.
        </p>

        <h2 className={h2}>Contenus et licences</h2>
        <p>
          Les textes grecs, traductions, dictionnaire et données linguistiques relèvent de leurs licences
          respectives, détaillées dans les <Link href="/mentions" className="link">mentions légales</Link>. Les cours,
          articles et traductions Anaginosko restent la propriété de leurs auteurs ; leur reproduction demande une
          autorisation.
        </p>

        <h2 className={h2}>Responsabilité</h2>
        <p>
          Les contenus sont fournis avec soin mais sans garantie d’exactitude ou d’exhaustivité. Ils ne remplacent ni
          un enseignement ni une édition critique. Anaginosko ne saurait être tenu responsable d’un usage qui en serait fait.
        </p>

        <h2 className={h2}>Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="link">politique de confidentialité</Link>.
        </p>

        <h2 className={h2}>Modifications et droit applicable</h2>
        <p>
          Ces conditions peuvent être mises à jour ; la date en tête de page fait foi. Elles sont soumises au droit
          français. Contact : contact@corentinrenard.com.
        </p>
      </div>
    </article>
  );
}
