// Manifest de la PWA: permite instalar el sistema como app en Windows o en el celular
export default function manifest() {
  return {
    name: "Moto Parts Inventory",
    short_name: "Moto Parts",
    description: "Sistema de control de inventario y ventas",
    start_url: "/",
    display: "standalone",
    theme_color: "#1a1d21",
    background_color: "#0d0f12",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
