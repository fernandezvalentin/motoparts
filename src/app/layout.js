import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Moto Parts — Sistema de Inventario",
  description:
    "Sistema de control de inventario para repuestos y accesorios de motos. Gestión de stock, categorías y proveedores.",
  applicationName: "Moto Parts",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Moto Parts",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a1426",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} dark`}>
      <body>{children}</body>
    </html>
  );
}
