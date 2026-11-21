import type { Metadata } from "next";
import "./globals.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import { Providers } from "@/components/app/providers";
import { AppShell } from "@/components/app/app-shell";
import { BRAND_BOOT_SCRIPT } from "@/components/app/brand-store";

export const metadata: Metadata = {
  title: "VisionQuant Studio",
  description: "Estudio local para convertir una idea en un video vertical: investigación, guion, storyboard, voz, animación y render.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BRAND_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
