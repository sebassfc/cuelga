import { ImageResponse } from "next/og";

/** Ícono de la app instalada y de las notificaciones: la marca sobre tinta, a sangre (el sistema redondea las esquinas). */
export function iconoApp(tam: number) {
  const marca = Math.round(tam * 0.62);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e1411" }}>
        <svg viewBox="-3 0 64 64" width={marca} height={marca}>
          <path d="M 37.47 18.6 A 17 17 0 1 0 37.47 45.4" fill="none" stroke="#f3f0e8" strokeWidth="9" />
          <rect x="26.62" y="14.97" width="18" height="12" rx="5" fill="#f3f0e8" transform="rotate(-52 35.62 20.97)" />
          <rect x="26.62" y="37.03" width="18" height="12" rx="5" fill="#f3f0e8" transform="rotate(52 35.62 43.03)" />
          <circle cx="46" cy="32" r="6" fill="#1fd17a" />
        </svg>
      </div>
    ),
    { width: tam, height: tam },
  );
}
