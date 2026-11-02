/** Une clases condicionales. Los componentes adaptados de 21st.dev lo esperan con este nombre. */
export function cn(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(" ");
}
