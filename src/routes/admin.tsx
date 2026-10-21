import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { readSettings, type Settings } from "@/lib/page-settings";
import { FEATURE_ICONS, getFeatureIcon } from "@/lib/feature-icons";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel – Vibe Call" },
      { name: "description", content: "Manage the Vibe Call app download." },
      { property: "og:title", content: "Admin Panel – Vibe Call" },
      { property: "og:description", content: "Owner and admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [slug, setSlug] = useState<string>("");
  const [pages, setPages] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [hasRoot, setHasRoot] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    setPages([]); setSlug(""); setIsOwner(false); setHasRoot(false);
    if (!session) return;
    let active = true;
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id",session.user.id),
      supabase.from("page_members").select("page_slug"),
      supabase.from("landing_pages").select("slug")
    ]).then(([roles,members,all]) => {
      if (!active) return;
      const owner = roles.data?.some(r=>r.role === "owner") ?? false;
      const staff = (roles.data?.length ?? 0) > 0;
      const allowed = owner ? (all.data ?? []).map(p=>p.slug) : [...new Set((members.data ?? []).map(p=>p.page_slug))];
      setIsOwner(owner); setHasRoot(staff); setPages(allowed);
      setSlug(staff ? "" : allowed[0] ?? "");
    });
    return () => {active=false;};
  }, [session?.user.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); queryClient.clear(); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-3xl font-extrabold">Admin <span className="text-gradient">Panel</span></h1>
      {session ? <>
        <label className="mb-6 block space-y-2"><span className="text-sm text-muted-foreground">Website page</span>
        <select aria-label="Website page" className={input} value={slug} onChange={e=>setSlug(e.target.value)}>
          {hasRoot && <option value="">Main website</option>}
          {!hasRoot && pages.length===0 && <option value="">No assigned pages</option>}
          {pages.map(page=><option key={page} value={page}>/{page}</option>)}
        </select></label>
        <Dashboard key={`${session.user.id}:${slug}`} session={session} slug={slug || null} />
        {isOwner && <PageAssignments onAssigned={page=>{setPages(p=>p.includes(page)?p:[...p,page]);setSlug(page);}} />}
      </> : <Login />}
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
      <Button className={btn} disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </Button>
    </form>
  );
}

function Dashboard({ session, slug }: { session: Session; slug: string | null }) {
  const queryClient = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    supabase.from("user_roles").select("role").eq("user_id", session.user.id)
      .then(({ data }) => setRoles((data ?? []).map((r) => r.role)));
    if (slug) {
      supabase.rpc("can_manage_page",{_slug:slug,_user_id:session.user.id}).then(({data})=>setAllowed(data === true));
      supabase.from("landing_pages").select("settings").eq("slug",slug).maybeSingle().then(({data})=>data && setS(readSettings(data.settings)));
    } else {
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => data && setS(readSettings(data)));
      supabase.from("user_roles").select("role").eq("user_id",session.user.id).then(({data})=>setAllowed((data?.length ?? 0)>0));
    }
  }, [session.user.id, slug]);

  const signOut = <Button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm text-muted-foreground underline">Sign out</Button>;

  if (roles === null || allowed === null) return null;
  if (!allowed) {
    return <div className="rounded-3xl border bg-card p-6"><p>You don't have access. Only the owner or admins can use this panel.</p>{signOut}</div>;
  }
  if (!s) return null;

  async function uploadApk(file: File) {
    setBusy(true); setMsg("Uploading…");
    const path = `${slug ? `${slug}/` : ""}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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
    const result = slug
      ? await supabase.from("landing_pages").update({settings:s,updated_at:new Date().toISOString()}).eq("slug",slug).select("slug")
      : await supabase.from("app_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", 1).select("id");
    const error = result.error ?? (result.data?.length ? null : {message:"You do not have permission to save this page."});
    if (!error) await queryClient.invalidateQueries({queryKey:["app_settings"]});
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

  const featureField = (n: 1 | 2 | 3) => {
    const textKey = `feature_${n}` as keyof Settings;
    const iconKey = `icon_${n}` as keyof Settings;
    const Preview = getFeatureIcon(s[iconKey]);
    return (
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground">Feature line {n}</span>
        <div className="flex items-center gap-2">
          <select
            className={`${input} w-auto`}
            value={s[iconKey] ?? "zap"}
            onChange={(e) => setS({ ...s, [iconKey]: e.target.value })}
            aria-label={`Icon for feature line ${n}`}
          >
            {FEATURE_ICONS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-secondary">
            <Preview className="h-5 w-5 text-primary" />
          </span>
          <input className={input} value={s[textKey] ?? ""} onChange={(e) => setS({ ...s, [textKey]: e.target.value })} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {slug && <p className="text-sm text-muted-foreground">Page: <a className="text-primary underline" href={`/${slug}`} target="_blank" rel="noreferrer">/{slug}</a></p>}
      <VisitStats slug={slug} userId={session.user.id} />
      <form onSubmit={save} className="space-y-4 rounded-3xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email} ({roles.join(", ")})</p>
        {field("app_name", "App name")}
        {field("tagline", "Tagline")}
        {field("badge_text", "Badge text (e.g. FREE VIDEO CALLS)")}
        {featureField(1)}
        {featureField(2)}
        {featureField(3)}
        {field("version", "Version")}
        {field("min_android", "Android requirement")}
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Upload new APK</span>
          <input type="file" accept=".apk" disabled={busy} className={input} onChange={(e) => e.target.files?.[0] && uploadApk(e.target.files[0])} />
        </label>
        {field("apk_url", "…or paste a download link")}
        <Button className={btn} disabled={busy}>Save changes</Button>
        {msg && <p className="text-sm text-success">{msg}</p>}
      </form>

      {roles.includes("owner") && (
        <form onSubmit={addAdmin} className="space-y-4 rounded-3xl border bg-card p-6">
          <h2 className="font-semibold">Add an admin</h2>
          <input className={input} type="email" placeholder="Their account email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          <Button className={btn}>Make admin</Button>
        </form>
      )}
      {signOut}
    </div>
  );
}

function VisitStats({slug,userId}: {slug:string|null;userId:string}) {
  const { data, isError } = useQuery({
    queryKey: ["visit_stats",userId,slug],
    refetchInterval: 30000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const month = new Date(today);
      month.setDate(month.getDate() - 30);

      const count = async (gte?: Date, lt?: Date) => {
        let q = supabase.from("page_visits").select("id", { count: "exact", head: true });
        q = slug ? q.eq("page_slug",slug) : q.is("page_slug",null);
        if (gte) q = q.gte("visited_at", gte.toISOString());
        if (lt) q = q.lt("visited_at", lt.toISOString());
        const { count: c, error } = await q;
        if (error) throw error;
        return c ?? 0;
      };

      const [todayCount, yesterdayCount, monthCount, allTime] = await Promise.all([
        count(today),
        count(yesterday, today),
        count(month),
        count(),
      ]);
      return { todayCount, yesterdayCount, monthCount, allTime };
    },
  });

  const stats = [
    { label: "Today", value: data?.todayCount },
    { label: "Yesterday", value: data?.yesterdayCount },
    { label: "Last 30 days", value: data?.monthCount },
    { label: "All time", value: data?.allTime },
  ];

  return (
    <section className="rounded-3xl border bg-card p-6">
      <h2 className="mb-4 font-semibold">Website visits</h2>
      {isError && <p className="text-destructive">Visit counts could not load.</p>}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-secondary/60 px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-gradient">{s.value ?? "…"}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Updates automatically every 30 seconds.</p>
    </section>
  );
}

function PageAssignments({onAssigned}: {onAssigned:(page:string)=>void}) {
 const [slug,setSlug]=useState(""); const [email,setEmail]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent) {
  e.preventDefault(); setBusy(true);
  const page=slug.trim().toLowerCase();
  const {error}=await supabase.rpc("assign_page_admin",{_slug:page,_email:email.trim()});
  setMsg(error ? error.message : "Page assigned. The admin can sign in after confirming their email.");
  if (!error) {onAssigned(page);setSlug("");setEmail("");} setBusy(false);
 }
 return <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border bg-card p-6">
 <h2 className="font-semibold">Assign a website page</h2>
 <label className="block space-y-1"><span className="text-sm text-muted-foreground">Page address</span><input className={input} placeholder="ankit45" required pattern="[a-z0-9][a-z0-9-]{2,39}" value={slug} onChange={e=>setSlug(e.target.value)} /></label>
 <label className="block space-y-1"><span className="text-sm text-muted-foreground">Admin email</span><input className={input} type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
 <Button className={btn} disabled={busy}>Assign page</Button>
 {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
 </form>;
}
