export default function PrivacyView() {
  return (
    <div className="pt-6 pb-4">
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-base-content/75">
        Cette page décrit les traitements de données personnelles réalisés sur Anaginosko. Dernière
        mise à jour : 19 juillet 2026.
      </p>

      <div className="mt-5 grid gap-3 text-sm leading-relaxed text-base-content/75">
        <section className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <h2 className="font-semibold text-base-content">Responsable du traitement</h2>
          <p className="mt-1">
            Corentin Renard. Pour toute question ou pour exercer vos droits :{" "}
            <a className="link" href="mailto:contact@corentinrenard.com">contact@corentinrenard.com</a>.
          </p>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <h2 className="font-semibold text-base-content">Signalements</h2>
          <p className="mt-1">
            Quand vous signalez une erreur ou demandez une note, nous traitons votre adresse e-mail,
            votre message, la référence concernée, un jeton de confirmation et une empreinte
            pseudonymisée de l’adresse IP. La finalité est de vérifier, prévenir les abus et traiter
            votre demande. La base légale est notre intérêt légitime à améliorer le corpus et à
            sécuriser le formulaire. Les champs e-mail et message sont obligatoires pour assurer le
            suivi ; sans eux, le signalement ne peut pas être envoyé.
          </p>
          <p className="mt-2">
            Les données sont accessibles aux seuls responsables et collaborateurs autorisés du
            projet. L’adresse e-mail et le lien de confirmation sont transmis à{" "}
            <a className="link" href="https://resend.com/legal/dpa" target="_blank" rel="noreferrer">Resend</a>,
            sous-traitant d’envoi d’e-mails établi aux États-Unis. Resend encadre les transferts hors
            Espace économique européen notamment par les clauses contractuelles types de l’Union
            européenne et le cadre UE–États-Unis relatif à la protection des données.
          </p>
          <p className="mt-2">
            Le lien de confirmation expire après 48 heures. Le signalement non confirmé est supprimé
            lors de la purge suivante, exécutée au plus toutes les six heures. À la confirmation,
            l’empreinte IP et le jeton sont supprimés. Après clôture, l’adresse e-mail et le contenu
            libre sont effacés au terme de 90 jours ; seules les informations non directement
            identifiantes nécessaires à l’historique éditorial sont conservées. Les demandes encore
            en cours restent conservées jusqu’à leur traitement.
          </p>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <h2 className="font-semibold text-base-content">Mesure d’audience</h2>
          <p className="mt-1">
            Anaginosko utilise une instance Matomo auto-hébergée pour mesurer la fréquentation. Le
            suivi désactive les cookies, respecte le signal « Do Not Track » et ne crée pas
            d’identifiant persistant dans le navigateur. Les données servent uniquement à produire
            des statistiques agrégées de fréquentation, sur la base de notre intérêt légitime à
            comprendre l’usage du service. Elles ne sont ni vendues ni utilisées pour la publicité
            ou le profilage intersites.
          </p>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <h2 className="font-semibold text-base-content">Stockage local et journaux techniques</h2>
          <p className="mt-1">
            Le navigateur mémorise localement vos préférences d’affichage, notamment le thème et les
            réglages de lecture. Ce stockage est fonctionnel et n’est pas transmis à Anaginosko.
            L’hébergeur et le serveur web peuvent par ailleurs traiter temporairement l’adresse IP,
            la date, la ressource demandée et des informations techniques dans leurs journaux, pour
            la sécurité, le diagnostic et le bon fonctionnement du service.
          </p>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <h2 className="font-semibold text-base-content">Vos droits</h2>
          <p className="mt-1">
            Vous pouvez demander l’accès, la rectification, l’effacement ou la limitation de vos
            données et vous opposer aux traitements fondés sur l’intérêt légitime. Écrivez à{" "}
            <a className="link" href="mailto:contact@corentinrenard.com">contact@corentinrenard.com</a>.
            Une réponse vous sera apportée dans le délai légal, en principe un mois. Si vous estimez
            que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de
            la{" "}
            <a className="link" href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">CNIL</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
