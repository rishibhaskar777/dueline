"use client";

import { Menu } from "@base-ui/react/menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/api-client";
import { ITEM_CLASS } from "./account-menu-styles";

export function LockDemoItem() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function lock(): Promise<void> {
    setPending(true);
    try {
      await signOut();
      router.push("/demo");
    } catch {
      setPending(false);
    }
  }

  return (
    <Menu.Item
      closeOnClick={false}
      disabled={pending}
      onClick={lock}
      className={`${ITEM_CLASS} text-late data-[disabled]:opacity-50`}
    >
      Lock demo
    </Menu.Item>
  );
}
