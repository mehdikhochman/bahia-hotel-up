export const metadata = { title: "Mentions légales — Bahia" };

export default function MentionsPage() {
  return (
    <>
      <p className="text-sand-600 text-xs sm:text-sm tracking-widest uppercase mb-2">
        Informations légales
      </p>
      <h1 className="font-display text-3xl md:text-4xl text-teal-700 mb-6">
        Mentions légales
      </h1>

      <Section title="Éditeur du site">
        <p>
          <strong>Bahia Hotel</strong>
          <br />
          Assinie Terminal — péninsule d'Assinie
          <br />
          Région du Sud-Comoé, Côte d'Ivoire
        </p>
        <p>
          Téléphone : +225 07 00 00 00 00
          <br />
          Email : <a href="mailto:reservations@bahia-assinie.ci">reservations@bahia-assinie.ci</a>
        </p>
        <p>
          Numéro de Registre de Commerce : <em>RCCM CI-ABJ-XXXX-X-XXXXX</em>
          <br />
          Identifiant fiscal : <em>à compléter</em>
        </p>
      </Section>

      <Section title="Directeur de publication">
        <p>Le directeur de l'établissement.</p>
      </Section>

      <Section title="Hébergement du site">
        <p>
          <strong>Vercel Inc.</strong>
          <br />
          340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
          <br />
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble des contenus présents sur ce site (textes, photographies,
          illustrations, logo, identité visuelle) sont la propriété exclusive
          de Bahia Hotel, sauf mention contraire. Toute reproduction ou
          réutilisation sans autorisation écrite préalable est interdite.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Pour toute question relative au site :{" "}
          <a href="mailto:reservations@bahia-assinie.ci">
            reservations@bahia-assinie.ci
          </a>
          .
          <br />
          Pour exercer vos droits sur vos données personnelles, voir notre{" "}
          <a href="/legal/confidentialite">politique de confidentialité</a>.
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
    <section className="mt-7">
      <h2 className="font-display text-xl text-teal-700 mb-2">{title}</h2>
      <div className="text-teal-600/90 text-[15px] leading-relaxed space-y-2 [&_a]:text-sand-700 [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
