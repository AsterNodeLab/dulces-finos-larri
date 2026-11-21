import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquetes de render de Remotion: solo se ejecutan en el worker (proceso aparte), nunca en el bundle de Next.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
  // La app es una herramienta local privada; no se despliega en serverless.
  poweredByHeader: false,
};

export default nextConfig;
