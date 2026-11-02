import type { Metadata } from "next";
import { Demo } from "./demo";

export const metadata: Metadata = {
  title: "Demo guiada",
  description: "Una llamada de secuestro virtual de ejemplo, de principio a fin: Cuelga reconoce el guion y verifica en silencio a la familiar.",
};

export default function Page() {
  return <Demo />;
}
