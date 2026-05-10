"use client";

import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  MessageCircle,
  Waves,
} from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="relative bg-teal-gradient text-ivory-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="grid lg:grid-cols-3 gap-10 mb-14">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="w-9 h-9 grid place-items-center rounded-full bg-ivory-100 text-teal-600">
                <Waves className="w-4 h-4" />
              </span>
              <span className="font-display text-3xl text-ivory-100">Bahia</span>
            </div>
            <p className="text-ivory-100/80 leading-relaxed text-sm max-w-sm">
              Hôtel boutique exclusif à Assinie Terminal, là où la lagune
              embrasse l'océan Atlantique. Une parenthèse rare, à 80 km
              d'Abidjan.
            </p>

            <div className="flex gap-3 mt-6">
              {[
                { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
                { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
                { icon: MessageCircle, href: "https://wa.me/22507000000", label: "WhatsApp" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-ivory-100/10 hover:bg-sand-500 hover:text-teal-800 grid place-items-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-ivory-100 font-display text-xl mb-5">
              Nous joindre
            </div>
            <ul className="space-y-3 text-sm text-ivory-100/85">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-sand-400 shrink-0" />
                <span>
                  Assinie Terminal, péninsule d'Assinie
                  <br />
                  Région du Sud-Comoé, Côte d'Ivoire
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-sand-400 shrink-0" />
                <a href="tel:+2250700000000" className="hover:text-ivory-100">
                  +225 07 00 00 00 00
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-sand-400 shrink-0" />
                <a
                  href="mailto:reservations@bahia-assinie.ci"
                  className="hover:text-ivory-100 break-all"
                >
                  reservations@bahia-assinie.ci
                </a>
              </li>
            </ul>

            <div className="mt-6 text-ivory-100/70 text-xs">
              Réception 24/7 · Check-in dès 14h
            </div>
          </div>

          <div>
            <div className="text-ivory-100 font-display text-xl mb-5">
              Notre emplacement
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden border border-ivory-100/10 relative bg-teal-900/40">
              <iframe
                title="Bahia — Assinie Terminal"
                src="https://www.google.com/maps?q=Assinie-Mafia,+C%C3%B4te+d%27Ivoire&output=embed"
                className="w-full h-full grayscale-[40%] contrast-110"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href="https://maps.google.com/?q=Assinie+Terminal,+Cote+d%27Ivoire"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sand-400 hover:text-sand-200 text-sm"
            >
              Itinéraire depuis Abidjan →
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-ivory-100/10 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-ivory-100/60">
          <div>
            © {new Date().getFullYear()} Bahia Hotel — Assinie Terminal. Tous
            droits réservés.
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center md:justify-end">
            <a href="/legal/cgv" className="hover:text-ivory-100">
              Conditions
            </a>
            <a href="/legal/confidentialite" className="hover:text-ivory-100">
              Confidentialité
            </a>
            <a href="/legal/mentions-legales" className="hover:text-ivory-100">
              Mentions légales
            </a>
            <a href="/admin/login" className="hover:text-ivory-100 opacity-70">
              Staff
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
