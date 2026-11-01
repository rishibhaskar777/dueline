import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationWatcher } from "@/components/notifications/NotificationWatcher";
import { CommandPalette } from "@/components/palette/CommandPalette";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      <CommandPalette />
      <NotificationWatcher />
    </div>
  );
}
