import { Building2, Bot, Bell, Webhook, Clock, Shield } from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "organizations", name: "Organizations", icon: Building2 },
  { id: "ai", name: "AI Configuration", icon: Bot },
  { id: "notifications", name: "Notifications", icon: Bell },
  { id: "webhooks", name: "Webhook URLs", icon: Webhook },
  { id: "polling", name: "Polling", icon: Clock },
  { id: "security", name: "Security", icon: Shield },
];

export const NON_DIRTY_SECTIONS = new Set(["organizations", "webhooks"]);
