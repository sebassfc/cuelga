import { networkInterfaces } from "node:os";

/**
 * Solo si la pantalla se abrió en localhost: la IP de la Mac en la red local, para que los enlaces
 * de los teléfonos no apunten a «localhost». Desplegado en un dominio, la pantalla usa ese dominio.
 */
export async function GET(req: Request) {
  // `req.url` trae la dirección donde escucha el servidor (0.0.0.0); el navegador manda la suya en Host.
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  if (host !== "localhost" && host !== "127.0.0.1") return Response.json({ ips: [] });
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
  return Response.json({ ips });
}
