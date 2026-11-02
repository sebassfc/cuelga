import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--fuente-display", display: "swap" });
const texto = Onest({ subsets: ["latin"], variable: "--fuente-texto", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000"),
  title: { default: "Cuelga · Te dicen que la tienen. Cuelga confirma que está bien.", template: "%s · Cuelga" },
  description: "Mientras el extorsionador habla, Cuelga escucha la llamada y le pregunta en silencio a tu familiar si está bien. Si contesta que sí, cuelgas.",
  openGraph: { siteName: "Cuelga", locale: "es_MX", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0b0f0d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${display.variable} ${texto.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
