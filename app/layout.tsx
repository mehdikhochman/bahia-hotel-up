import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Bahia — Hôtel Boutique • Assinie Terminal",
  description:
    "Évasion exclusive entre lagune et océan. Villas et chambres d'exception à Assinie Terminal, Côte d'Ivoire. Karaoké tous les samedis soirs.",
  keywords: [
    "hôtel Assinie",
    "Bahia hotel",
    "villa Assinie Terminal",
    "boutique hotel Côte d'Ivoire",
    "karaoké Assinie",
  ],
  openGraph: {
    title: "Bahia — Hôtel Boutique à Assinie Terminal",
    description:
      "Là où la lagune embrasse l'océan. Une parenthèse de luxe sur la pointe d'Assinie.",
    type: "website",
    locale: "fr_CI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#00688B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-ivory-100 antialiased">{children}</body>
    </html>
  );
}
