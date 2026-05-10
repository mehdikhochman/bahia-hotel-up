export const metadata = { title: "Politique de confidentialité — Bahia" };

export default function PrivacyPage() {
  return (
    <>
      <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-2">
        Données personnelles
      </p>
      <h1 className="font-display text-3xl md:text-4xl text-teal-700 mb-2">
        Politique de confidentialité
      </h1>
      <p className="text-teal-500 text-sm">
        Conforme à la Loi n° 2013-450 (Côte d'Ivoire) et au RGPD (UE)
      </p>

      <Section title="1. Responsable du traitement">
        <p>
          Bahia Hotel — Assinie Terminal, Côte d'Ivoire. Délégué à la
          protection des données :{" "}
          <a href="mailto:dpo@bahia-assinie.ci">dpo@bahia-assinie.ci</a>.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <ul>
          <li>
            <strong>Identité</strong> : nom complet, type et numéro de pièce
            (CNI / passeport / carte consulaire), <strong>copie scannée</strong> de la
            pièce.
          </li>
          <li>
            <strong>Contact</strong> : adresse email, numéro de téléphone,
            nationalité.
          </li>
          <li>
            <strong>Réservation</strong> : dates, hébergement choisi, nombre
            de voyageurs, montant.
          </li>
          <li>
            <strong>Paiement</strong> : identifiant de transaction Wave (la
            réservation ne stocke jamais de coordonnées bancaires).
          </li>
        </ul>
      </Section>

      <Section title="3. Finalités">
        <ul>
          <li>Gestion de la réservation et du séjour.</li>
          <li>
            Déclaration légale des voyageurs auprès des autorités ivoiriennes
            (Direction de la Surveillance du Territoire).
          </li>
          <li>Communication transactionnelle (confirmation, paiement, séjour).</li>
          <li>Sécurité du site et prévention de la fraude.</li>
        </ul>
      </Section>

      <Section title="4. Base légale">
        <p>
          Le traitement repose sur (i) l'<strong>exécution du contrat</strong>
          de réservation, (ii) une <strong>obligation légale</strong> pour la
          conservation de la pièce d'identité, (iii) votre{" "}
          <strong>consentement explicite</strong> recueilli au moment de la
          réservation.
        </p>
      </Section>

      <Section title="5. Durée de conservation">
        <ul>
          <li>Données de réservation : 5 ans après la fin du séjour (comptable).</li>
          <li>
            Copie de la pièce d'identité : 12 mois maximum, sauf obligation
            légale supérieure imposée par les autorités.
          </li>
          <li>
            Données marketing (si vous y avez consenti séparément) : 3 ans
            après le dernier contact.
          </li>
        </ul>
      </Section>

      <Section title="6. Destinataires et sécurité">
        <p>
          Les données ne sont accessibles qu'au personnel autorisé de Bahia.
          Les copies de pièces d'identité sont stockées sur un service
          chiffré (Vercel Blob) et consultables uniquement via un accès
          authentifié et journalisé. Aucun transfert n'est effectué hors
          contexte légal.
        </p>
      </Section>

      <Section title="7. Vos droits">
        <p>Vous disposez à tout moment des droits :</p>
        <ul>
          <li>d'<strong>accès</strong> à vos données,</li>
          <li>de <strong>rectification</strong>,</li>
          <li>d'<strong>effacement</strong> (sous réserve des obligations légales),</li>
          <li>d'<strong>opposition</strong> et de <strong>portabilité</strong>.</li>
        </ul>
        <p>
          Pour exercer ces droits :{" "}
          <a href="mailto:dpo@bahia-assinie.ci">dpo@bahia-assinie.ci</a>.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Le site n'utilise que des cookies fonctionnels strictement
          nécessaires (session staff). Aucun cookie publicitaire ni de
          tracking tiers n'est déposé sans votre consentement explicite.
        </p>
      </Section>

      <Section title="9. Mise à jour">
        <p>
          Cette politique peut évoluer. La date de dernière mise à jour est
          affichée en tête de document. Les modifications substantielles
          vous seront notifiées par email.
        </p>
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-teal-700 mb-2">{title}</h2>
      <div className="text-teal-600/90 text-[15px] leading-relaxed space-y-2 [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-sand-700 [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
