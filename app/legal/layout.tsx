import Link from "next/link";
import { ArrowLeft, Waves } from "lucide-react";

const LINKS = [
  { href: "/legal/cgv", label: "Conditions générales" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/mentions-legales", label: "Mentions légales" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] bg-ivory-gradient">
      <header className="border-b border-ivory-200 bg-ivory-100/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 grid place-items-center rounded-full bg-teal-500 text-ivory-100">
              <Waves className="w-4 h-4" />
            </span>
            <span className="font-display text-xl text-teal-700">Bahia</span>
          </Link>
          <Link
            href="/"
            className="text-teal-500 text-sm flex items-center gap-1.5 hover:text-teal-700"
          >
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10 lg:py-14 grid md:grid-cols-[200px,1fr] gap-8">
        <nav className="md:sticky md:top-20 md:self-start">
          <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {LINKS.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  className="block px-3 py-2 rounded-lg text-teal-600 hover:bg-ivory-200 text-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="prose prose-teal max-w-none text-teal-700">
          {children}
        </article>
      </div>
    </div>
  );
}
