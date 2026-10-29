import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuelga",
  description: "Escudo contra el secuestro virtual: confirma en silencio que tu familiar está a salvo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">{children}</body>
    </html>
  );
}
