import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_ICONS, getFeatureIcon } from "@/lib/feature-icons";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel – Vibe Call" },
      { name: "description", content: "Manage the Vibe Call app download." },
      { property: "og:title", content: "Admin Panel – Vibe Call" },
      { property: "og:description", content: "Owner and admin area." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const input = "w-full rounded-xl border bg-secondary px-4 py-3 outline-none focus:border-primary";
const btn = "w-full rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground disabled:opacity-50";

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-3xl font-extrabold">Admin <span className="text-gradient">Panel</span></h1>
      {session ? <Dashboard session={session} /> : <Login />}
    </main>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setMsg(error ? error.message : "Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border bg-card p-6">
      <input className={input} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className={btn} disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

type Settings = { app_name: string; tagline: string; apk_url: string | null; version: string; min_android: string; badge_text: string; feature_1: string; feature_2: string; feature_3: string; icon_1: string; icon_2: string; icon_3: string };

function Dashboard({ session }: { session: Session }) {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", session.user.id)
      .then(({ data }) => setRoles((data ?? []).map((r) => r.role)));
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => data && setS(data));
  }, [session.user.id]);

  const signOut = <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-muted-foreground underline">Sign out</button>;

  if (roles === null) return null;
  if (!roles.includes("owner") && !roles.includes("admin")) {
    return <div className="rounded-3xl border bg-card p-6"><p>You don't have access. Only the owner or admins can use this panel.</p>{signOut}</div>;
  }
  if (!s) return null;

  async function uploadApk(file: File) {
    setBusy(true); setMsg("Uploading…");
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("apks").upload(path, file, { contentType: "application/vnd.android.package-archive" });
    if (error) { setMsg(error.message); setBusy(false); return; }
    const { data, error: e2 } = await supabase.storage.from("apks").createSignedUrl(path, 60 * 60 * 24 * 365 * 10, { download: file.name });
    if (e2 || !data) { setMsg(e2?.message ?? "Failed"); setBusy(false); return; }
    setS((p) => p && { ...p, apk_url: data.signedUrl });
    setMsg("APK uploaded. Press Save to publish it.");
    setBusy(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", 1);
    setMsg(error ? error.message : "Saved! The download page is updated.");
    setBusy(false);
  }

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("grant_admin_by_email", { _email: adminEmail });
    setMsg(error ? error.message : data ? `${adminEmail} is now an admin.` : "No account found with that email. Ask them to create one first.");
    setAdminEmail("");
  }

  const field = (k: keyof Settings, label: string) => (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input className={input} value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </label>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-4 rounded-3xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email} ({roles.join(", ")})</p>
        {field("app_name", "App name")}
        {field("tagline", "Tagline")}
        {field("badge_text", "Badge text (e.g. FREE VIDEO CALLS)")}
        {field("feature_1", "Feature line 1")}
        {field("feature_2", "Feature line 2")}
        {field("feature_3", "Feature line 3")}
        {field("version", "Version")}
        {field("min_android", "Android requirement")}
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Upload new APK</span>
          <input type="file" accept=".apk" disabled={busy} className={input} onChange={(e) => e.target.files?.[0] && uploadApk(e.target.files[0])} />
        </label>
        {field("apk_url", "…or paste a download link")}
        <button className={btn} disabled={busy}>Save changes</button>
        {msg && <p className="text-sm text-success">{msg}</p>}
      </form>

      {roles.includes("owner") && (
        <form onSubmit={addAdmin} className="space-y-4 rounded-3xl border bg-card p-6">
          <h2 className="font-semibold">Add an admin</h2>
          <input className={input} type="email" placeholder="Their account email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          <button className={btn}>Make admin</button>
        </form>
      )}
      {signOut}
    </div>
  );
}
