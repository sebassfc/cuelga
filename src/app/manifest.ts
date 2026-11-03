import type { MetadataRoute } from "next";

/**
 * Permite instalar Cuelga en la pantalla de inicio: en iPhone es la única forma de recibir notificaciones.
 * Sin `start_url` a propósito: así la app instalada abre la página desde donde se agregó (la del familiar).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuelga",
    short_name: "Cuelga",
    description: "Te dicen que la tienen. Cuelga confirma que está bien.",
    lang: "es-MX",
    display: "standalone",
    background_color: "#0b0f0d",
    theme_color: "#0b0f0d",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
