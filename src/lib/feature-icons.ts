import {
  Zap,
  ShieldCheck,
  Users,
  Video,
  Phone,
  Globe,
  Lock,
  Wifi,
  Heart,
  Star,
  Bell,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export const FEATURE_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "zap", label: "Lightning (fast)", Icon: Zap },
  { key: "shield", label: "Shield (secure)", Icon: ShieldCheck },
  { key: "users", label: "People (friends)", Icon: Users },
  { key: "video", label: "Video camera", Icon: Video },
  { key: "phone", label: "Phone", Icon: Phone },
  { key: "globe", label: "Globe (worldwide)", Icon: Globe },
  { key: "lock", label: "Lock (private)", Icon: Lock },
  { key: "wifi", label: "Wi-Fi (connection)", Icon: Wifi },
  { key: "heart", label: "Heart", Icon: Heart },
  { key: "star", label: "Star", Icon: Star },
  { key: "bell", label: "Bell (alerts)", Icon: Bell },
  { key: "chat", label: "Chat bubble", Icon: MessageCircle },
];

export function getFeatureIcon(key: string | null | undefined): LucideIcon {
  return FEATURE_ICONS.find((i) => i.key === key)?.Icon ?? Zap;
}
