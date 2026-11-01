"use client";

import { useRouter } from "next/navigation";
import { toggleTheme } from "@/components/layout/theme";
import { useEffect, useMemo, useState } from "react";
import { SearchList } from "@/components/shared/SearchList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getClients, getInvoices } from "@/lib/api-client";
import type { ClientSummary, InvoiceSummary } from "@/types";
import { buildCommands } from "./palette-commands";
import { OPEN_PALETTE_EVENT, shortcutFor } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";

interface Loaded {
  invoices: InvoiceSummary[];
  clients: ClientSummary[];
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ invoices: [], clients: [] });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = shortcutFor({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        target: event.target as HTMLElement | null,
      });
      if (target === null) return;
      event.preventDefault();
      if (target === "palette") setOpen(true);
      else setShortcutsOpen(true);
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  // Clients and invoices are read when the palette opens, so it always searches the latest.
  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.allSettled([getInvoices(), getClients()]).then(([invoices, clients]) => {
      if (!active) return;
      setLoaded({
        invoices: invoices.status === "fulfilled" ? invoices.value.invoices : [],
        clients: clients.status === "fulfilled" ? clients.value : [],
      });
    });
    return () => {
      active = false;
    };
  }, [open]);

  const commands = useMemo(() => buildCommands(loaded), [loaded]);

  function choose(id: string): void {
    const command = commands.find((candidate) => candidate.id === id);
    setOpen(false);
    if (!command) return;
    if (command.action.kind === "go") router.push(command.action.href);
    else toggleTheme();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Command palette</DialogTitle>
            <DialogDescription>
              Go to a page, open a client or invoice, or draft a reminder.
            </DialogDescription>
          </DialogHeader>
          <SearchList
            label="Search commands"
            placeholder="Type a page, client or invoice"
            emptyText="Nothing matches. Try a client name or an invoice number."
            options={commands}
            onChoose={choose}
          />
        </DialogContent>
      </Dialog>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
