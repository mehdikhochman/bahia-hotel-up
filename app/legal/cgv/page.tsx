export const metadata = { title: "Conditions générales — Bahia" };

export default function CGVPage() {
  return (
    <>
      <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-2">
        Document légal
      </p>
      <h1 className="font-display text-3xl md:text-4xl text-teal-700 mb-2">
        Conditions Générales de Vente
      </h1>
      <p className="text-teal-500 text-sm">
        En vigueur depuis le 1<sup>er</sup> janvier 2026
      </p>

      <Section title="1. Identification de l'établissement">
        <p>
          Bahia Hotel est un établissement hôtelier situé à Assinie Terminal,
          péninsule d'Assinie, région du Sud-Comoé, Côte d'Ivoire. Le présent
          document régit toute réservation effectuée via le site
          bahia-assinie.ci.
        </p>
      </Section>

      <Section title="2. Réservation et paiement">
        <p>
          Toute réservation engage le voyageur dès la confirmation du paiement
          via le service <strong>Wave Money</strong>. Le voyageur reçoit une
          référence unique <code>BHA-…</code> par email après création de la
          réservation, et doit régler le montant exact via Wave dans les 30
          minutes suivantes.
        </p>
        <p>
          La place est garantie une fois le paiement vérifié par notre équipe.
          En l'absence de paiement sous 30 minutes, la réservation peut être
          annulée automatiquement et le créneau remis en vente.
        </p>
      </Section>

      <Section title="3. Tarifs">
        <p>
          Les tarifs affichés sont exprimés en Franc CFA (XOF), par nuit et
          par hébergement. Ils incluent les taxes en vigueur. La taxe de
          séjour, si applicable, est précisée lors du récapitulatif.
        </p>
      </Section>

      <Section title="4. Annulation et modification">
        <ul>
          <li>
            <strong>Plus de 14 jours avant l'arrivée</strong> : remboursement
            intégral, hors frais Wave.
          </li>
          <li>
            <strong>Entre 14 et 3 jours</strong> : 50 % du séjour retenu.
          </li>
          <li>
            <strong>Moins de 3 jours / no-show</strong> : aucun remboursement.
          </li>
        </ul>
        <p>
          Toute demande d'annulation doit être adressée à
          reservations@bahia-assinie.ci avec la référence de réservation.
        </p>
      </Section>

      <Section title="5. Identification légale des voyageurs">
        <p>
          Conformément à la réglementation ivoirienne et aux exigences de la
          Direction de la Surveillance du Territoire, l'établissement
          conserve une copie de la pièce d'identité (CNI, passeport ou carte
          consulaire) de chaque voyageur. Cette obligation s'applique à
          l'ensemble des établissements hôteliers du pays.
        </p>
      </Section>

      <Section title="6. Check-in / Check-out">
        <p>
          Le check-in est ouvert dès 14h00. Le check-out est attendu avant
          12h00. Tout dépassement peut faire l'objet d'une nuitée
          supplémentaire facturée au tarif standard.
        </p>
      </Section>

      <Section title="7. Responsabilité">
        <p>
          L'hôtel décline toute responsabilité en cas de perte ou de vol
          d'objets non confiés au coffre de la réception. La piscine et la
          plage privée sont sous la responsabilité du voyageur.
        </p>
      </Section>

      <Section title="8. Saturday Night Karaoké">
        <p>
          La soirée karaoké du samedi est ouverte sur réservation, sous
          réserve des places disponibles. Le dress-code et les conditions
          d'accès sont précisés lors de la confirmation.
        </p>
      </Section>

      <Section title="9. Loi applicable">
        <p>
          Les présentes conditions sont régies par le droit ivoirien. Tout
          litige sera porté devant les juridictions compétentes d'Abidjan.
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
      <div className="text-teal-600/90 text-[15px] leading-relaxed space-y-2 [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
