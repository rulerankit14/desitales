export type Settings = { app_name: string; tagline: string; apk_url: string | null; version: string; min_android: string; badge_text: string; feature_1: string; feature_2: string; feature_3: string; icon_1: string; icon_2: string; icon_3: string };
export function pageQueryKey(slug: string | null) { return ["app_settings", slug ?? "root"]; }
export function visitPath(slug: string | null) { return slug ? `/${slug}` : "/"; }
export function readSettings(value: unknown): Settings {
 const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
 const text = (key: string, fallback: string) => typeof v[key] === "string" ? v[key] as string : fallback;
 return {app_name:text("app_name","Vibe Call"),tagline:text("tagline","Free HD video calls with friends & family"),apk_url:typeof v.apk_url === "string" ? v.apk_url : null,version:text("version","1.0.0"),min_android:text("min_android","Android 7.0+"),badge_text:text("badge_text","FREE VIDEO CALLS"),feature_1:text("feature_1","Instant HD video connection"),feature_2:text("feature_2","Private & secure calls"),feature_3:text("feature_3","100% free – no hidden charges"),icon_1:text("icon_1","zap"),icon_2:text("icon_2","shield"),icon_3:text("icon_3","users")};
}
