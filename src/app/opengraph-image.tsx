import { ImageResponse } from "next/og";

export const alt = "Cuelga: te dicen que la tienen, Cuelga confirma que está bien.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagen() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f3f0e8", color: "#0e1411", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg viewBox="0 0 64 64" width="72" height="72">
            <path d="M 37.47 18.6 A 17 17 0 1 0 37.47 45.4" fill="none" stroke="#0e1411" strokeWidth="9" />
            <rect x="26.62" y="14.97" width="18" height="12" rx="5" fill="#0e1411" transform="rotate(-52 35.62 20.97)" />
            <rect x="26.62" y="37.03" width="18" height="12" rx="5" fill="#0e1411" transform="rotate(52 35.62 43.03)" />
            <circle cx="46" cy="32" r="6" fill="#1fd17a" />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>cuelga</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 800, lineHeight: 0.98, letterSpacing: -3 }}>
          <span>Te dicen que la tienen.</span>
          <span>Cuelga confirma que está bien.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#4a544e" }}>
          <span style={{ display: "flex", background: "#1fd17a", color: "#0e1411", padding: "10px 22px", borderRadius: 999, fontWeight: 700 }}>ANA ESTÁ A SALVO. CUELGA.</span>
          <span>Contra el secuestro virtual · Muse Spark Open de Meta</span>
        </div>
      </div>
    ),
    size,
  );
}
