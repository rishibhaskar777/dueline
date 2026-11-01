"use client";

import { useState } from "react";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { isNotifySupported, readNotifyChoice, writeNotifyChoice } from "./notify-setting";

type Choice = { on: boolean; message: string | null };

// Permission is asked for only here, when the switch is turned on.
export function NotifyToggle() {
  const [choice, setChoice] = useState<Choice>(() => ({
    on: isNotifySupported() && Notification.permission === "granted" && readNotifyChoice(),
    message: null,
  }));

  if (!isNotifySupported()) {
    return (
      <p className="text-sm text-muted-foreground">
        This browser cannot show notifications, so alerts appear in the app only.
      </p>
    );
  }

  async function change(on: boolean): Promise<void> {
    if (!on) {
      writeNotifyChoice(false);
      setChoice({ on: false, message: null });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setChoice({
        on: false,
        message:
          "Notifications are blocked for this site. Allow them in the browser to turn this on.",
      });
      return;
    }
    writeNotifyChoice(true);
    setChoice({ on: true, message: null });
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Notify me in this browser</span>
        <ToggleSwitch
          label="Notify me in this browser"
          checked={choice.on}
          onChange={(on) => void change(on)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Shows a notification while Dueline is open when a rate alert fires or a payment arrives.
        Nothing is sent by email or to other devices.
      </p>
      {choice.message && (
        <p role="alert" className="text-sm text-late">
          {choice.message}
        </p>
      )}
    </div>
  );
}
