import type { Metadata } from "next";
import LegalDoc, { Ext, Mail, type LegalSection } from "@/app/_components/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Politique de confidentialité",
  description: "Traitements de données personnelles, mesure d’audience et droits des utilisateurs d’Anaginosko.",
  path: "/confidentialite",
});

const RESEND = <Ext href="https://resend.com/legal/dpa">Resend</Ext>;

const SECTIONS: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    body: (
      <p>
        Corentin Renard. Pour toute question ou pour exercer vos droits : <Mail />.
      </p>
    ),
  },
  {
    id: "compte",
    title: "Compte et cours",
    body: (
      <>
        <p>
          Un compte sert à suivre les cours et à garder sa progression. Nous traitons votre adresse e-mail, votre nom
          affiché, les leçons terminées, la date de création du compte et la date de dernière utilisation de votre
          session. Avec Google, nous recevons aussi un identifiant de compte Google, sans accès à vos autres données.
          Base légale : l’exécution du service que vous demandez.
        </p>
        <p>
          Aucun mot de passe n’est stocké. La connexion passe par un code à usage unique, envoyé par {RESEND} et conservé
          chiffré 10 minutes au plus, ou par Google, soumis à ses propres règles. La session est gardée dans votre
          navigateur (stockage local et cookie fonctionnel, 30 jours).
        </p>
        <p>Vous pouvez supprimer votre compte et votre progression depuis « Paramètres » : l’effacement est immédiat.</p>
      </>
    ),
  },
  {
    id: "lettre",
    title: "Lettre d’information",
    body: (
      <p>
        La lettre et les avis de nouvel article ne sont envoyés qu’avec votre accord. Nous conservons la date de cet
        accord et un jeton de désinscription. Les envois passent par {RESEND}. Chaque message contient un lien de
        désinscription ; le réglage se modifie aussi dans « Paramètres ». Base légale : votre consentement.
      </p>
    ),
  },
  {
    id: "signalements",
    title: "Signalements",
    body: (
      <>
        <p>
          Quand vous signalez une erreur ou demandez une note, nous traitons votre adresse e-mail, votre message, la
          référence concernée, un jeton de confirmation et une empreinte pseudonymisée de l’adresse IP, pour vérifier la
          demande, prévenir les abus et y répondre. Base légale : notre intérêt légitime à améliorer le corpus et à
          sécuriser le formulaire. L’e-mail et le message sont obligatoires.
        </p>
        <p>
          Le lien de confirmation expire après 48 heures ; un signalement non confirmé est supprimé dans les six heures
          qui suivent. À la confirmation, l’empreinte IP et le jeton sont supprimés. Après clôture, l’e-mail et le
          message sont effacés au bout de 90 jours ; seules des informations non identifiantes restent dans
          l’historique éditorial.
        </p>
      </>
    ),
  },
  {
    id: "contributions",
    title: "Contributions",
    body: (
      <p>
        Les membres de l’équipe qui écrivent des articles, des leçons ou des traductions sont crédités sous leur nom
        affiché. Ce nom, les commentaires de relecture et l’historique des modifications sont conservés tant que la
        contribution existe.
      </p>
    ),
  },
  {
    id: "assistant",
    title: "Assistant IA (bêta)",
    body: (
      <p>
        Réservé aux comptes de l’équipe qui l’activent. Chacun fournit sa propre clé d’API, conservée chiffrée et jamais
        réaffichée. Les questions, les passages et les données du site utiles à la réponse sont envoyés au fournisseur
        choisi (Anthropic, OpenAI, Google, Mistral, OpenRouter ou un serveur compatible), selon ses propres conditions.
        Les conversations sont conservées dans le compte jusqu’à leur suppression.
      </p>
    ),
  },
  {
    id: "audience",
    title: "Mesure d’audience",
    body: (
      <p>
        Une instance Matomo auto-hébergée mesure la fréquentation, sans cookie ni identifiant persistant, et respecte
        le signal « Do Not Track ». Les données servent uniquement à des statistiques agrégées, sur la base de notre
        intérêt légitime à comprendre l’usage du site. Elles ne sont ni vendues ni utilisées pour la publicité. Durée de
        conservation : 13 mois.
      </p>
    ),
  },
  {
    id: "stockage",
    title: "Stockage local et journaux",
    body: (
      <p>
        Le navigateur garde vos préférences d’affichage (thème, réglages de lecture) et, si vous êtes connecté, votre
        session ; seule la session est transmise au serveur. Le serveur web enregistre l’adresse IP, la date et la
        ressource demandée pour la sécurité et le diagnostic. Ces journaux sont conservés 14 jours.
      </p>
    ),
  },
  {
    id: "destinataires",
    title: "Destinataires et transferts",
    body: (
      <p>
        Les données ne sont accessibles qu’aux responsables du projet et aux collaborateurs autorisés. Hébergement :
        OVH, en France. Envoi d’e-mails : {RESEND}, établi aux États-Unis ; les transferts hors de l’Espace économique
        européen sont encadrés par les clauses contractuelles types de l’Union européenne et le cadre UE–États-Unis de
        protection des données.
      </p>
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    body: (
      <p>
        Vous pouvez demander l’accès, la rectification, l’effacement ou la limitation de vos données, et vous opposer
        aux traitements fondés sur l’intérêt légitime, en écrivant à <Mail />. Réponse sous un mois. En cas de
        désaccord, vous pouvez saisir la <Ext href="https://www.cnil.fr/fr/plaintes">CNIL</Ext>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return <LegalDoc path="/confidentialite" title="Confidentialité" updated="17 octobre 2026" sections={SECTIONS} />;
}
