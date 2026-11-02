import type { Metadata } from "next";
import { Suspense } from "react";
import { Familiar } from "./familiar";

export const metadata: Metadata = { title: "Cuelga · Familiar", robots: { index: false } };

export default function Page({ params, searchParams }: PageProps<"/familiar/[canal]/[contacto]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <Familiar params={params} searchParams={searchParams as Promise<{ n?: string; de?: string }>} />
    </Suspense>
  );
}
