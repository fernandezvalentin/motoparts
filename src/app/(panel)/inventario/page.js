import { InventarioPage } from "./InventarioPage";

export default async function Page({ searchParams }) {
  const { stockBajo } = await searchParams;
  return <InventarioPage stockBajoInicial={stockBajo === "true"} />;
}
