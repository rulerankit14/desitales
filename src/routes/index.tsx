import { createFileRoute } from "@tanstack/react-router";
import { DownloadPage } from "@/components/download-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Vibe Call – Free HD Video Calls for Android" },
      { name: "description", content: "Download Vibe Call: free, fast HD video calls with friends and family." },
      { property: "og:title", content: "Vibe Call – Free HD Video Calls" },
      { property: "og:description", content: "Free, fast HD video calls with friends and family. Download the Android app." },
    ],
  }),
  component: DownloadPage,
});

