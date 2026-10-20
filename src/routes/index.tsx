import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Video, Download, Zap, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vibe Call – Free HD Video Calls for Android" },
      { name: "description", content: "Download Vibe Call: free, fast HD video calls with friends and family." },
      { property: "og:title", content: "Vibe Call – Free HD Video Calls" },
      { property: "og:description", content: "Free, fast HD video calls with friends and family. Download the Android app." },
    ],
  }),
  component: Index,
});

const featureIcons = [Zap, ShieldCheck, Users];

function Index() {
  const { data } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });

  const name = data?.app_name ?? "Vibe Call";
  const [first, ...rest] = name.split(" ");
  const featureTexts = [
    data?.feature_1 ?? "Instant HD video connection",
    data?.feature_2 ?? "Private & secure calls",
    data?.feature_3 ?? "100% free – no hidden charges",
  ];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-card/60 p-7 text-center shadow-glow backdrop-blur">
        <span className="inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold tracking-widest text-primary-foreground">
          FREE VIDEO CALLS
        </span>
        <h1 className="mt-6 text-5xl font-extrabold">
          {first} {rest.length > 0 && <span className="text-gradient">{rest.join(" ")}</span>}
        </h1>
        <p className="mt-3 text-muted-foreground">{data?.tagline ?? "Free HD video calls with friends & family"}</p>

        <div className="mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full border-2 border-primary/60 pulse-ring">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
            <Video className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        <ul className="mt-8 space-y-3 text-left">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl border bg-secondary/60 px-4 py-3">
              <Icon className="h-5 w-5 text-primary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <a
          href={data?.apk_url ?? undefined}
          aria-disabled={!data?.apk_url}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-primary py-4 text-lg font-extrabold tracking-wide text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <Download className="h-6 w-6" /> {data?.apk_url ? "DOWNLOAD APK" : "COMING SOON"}
        </a>
        <p className="mt-4 text-sm text-muted-foreground">
          {data?.min_android ?? "Android 7.0+"} • v{data?.version ?? "1.0.0"} • Free Download
        </p>
      </div>
    </main>
  );
}
