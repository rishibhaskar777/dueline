"use client";

import { Wrench } from "lucide-react";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import { NavLink } from "./NavLink";

export function DemoToolsLink() {
  if (!useDemoMode()) return null;
  return (
    <li>
      <NavLink href="/demo-tools" icon={<Wrench aria-hidden="true" className="size-5 shrink-0" />}>
        Demo tools
      </NavLink>
    </li>
  );
}
