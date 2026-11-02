import { AppBar } from "@/components/layout/AppBar";
import { NotificationWatcher } from "@/components/notifications/NotificationWatcher";
import { CommandPalette } from "@/components/palette/CommandPalette";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppBar />
      <main className="relative z-10 mx-auto w-full max-w-[1328px] min-w-0 flex-1 px-4 pt-9 pb-16 md:px-4 lg:px-6">
        {children}
      </main>
      <CommandPalette />
      <NotificationWatcher />
    </div>
  );
}
