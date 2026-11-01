const STORAGE_KEY = "dueline.notify.v1";

export function isNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Kept in this browser only, since a permission belongs to one browser too.
export function readNotifyChoice(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeNotifyChoice(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // The choice then lasts until the page is closed.
  }
}

export function canShowNotifications(): boolean {
  return isNotifySupported() && Notification.permission === "granted" && readNotifyChoice();
}
