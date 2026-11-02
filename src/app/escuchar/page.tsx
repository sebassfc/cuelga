import type { Metadata } from "next";
import { Escucha } from "./escucha";

export const metadata: Metadata = { title: "Escuchar" };

export default function Page() {
  return <Escucha />;
}
