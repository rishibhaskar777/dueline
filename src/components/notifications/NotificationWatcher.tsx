"use client";

import { useEffect } from "react";
import { getActivity, getRateAlerts } from "@/lib/api-client";
import { findNewMessages, type Seen } from "./new-notifications";
import { canShowNotifications } from "./notify-setting";

const CHECK_EVERY_MS = 60_000;

// Watches while the app is open and shows a browser notification for anything new. It does nothing
// until the freelancer has turned notifications on.
export function NotificationWatcher() {
  useEffect(() => {
    let seen: Seen | null = null;

    async function check(): Promise<void> {
      if (!canShowNotifications()) {
        seen = null;
        return;
      }
      try {
        const [alerts, events] = await Promise.all([getRateAlerts(), getActivity()]);
        const found = findNewMessages(seen, alerts, events);
        seen = found.seen;
        found.messages.forEach(({ id, title, body }) => new Notification(title, { body, tag: id }));
      } catch {
        // The next check tries again.
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
