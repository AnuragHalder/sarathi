import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sarathi: Gita Counsel",
    short_name: "Sarathi",
    description: "Guidance for life's battles, from the Bhagavad Gita.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ec",
    theme_color: "#c2410c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
