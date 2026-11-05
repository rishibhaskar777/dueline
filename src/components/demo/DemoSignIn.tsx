"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showTourAgain } from "@/components/dashboard/use-layout";
import { ApiClientError, signIn } from "@/lib/api-client";
import { safeNextPath } from "@/lib/demo-access/next-path";
import { checkPassword } from "./password-check";

function messageFor(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthorized") {
    return "That password is not right. Check it and try again.";
  }
  if (error instanceof ApiClientError && error.code === "rate_limited") {
    return "Too many attempts. Wait 15 minutes and try again.";
  }
  return "Could not open the demo. Try again in a moment.";
}

export function DemoSignIn() {
  const next = safeNextPath(useSearchParams().get("next"));
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  function report(message: string): void {
    setProblem(message);
    field.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const missing = checkPassword(password);
    if (missing) {
      report(missing);
      return;
    }
    setPending(true);
    setProblem(null);
    try {
      await signIn(password);
      showTourAgain();
      window.location.assign(next);
    } catch (error) {
      report(messageFor(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-[22px]" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="demo-password" className="text-[15px] font-semibold">
          Demo password
        </Label>
        <div className="relative">
          <Input
            id="demo-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            ref={field}
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={problem !== null}
            aria-describedby={problem ? "demo-password-error" : undefined}
            className="h-[58px] rounded-2xl pr-[92px] pl-[18px] text-[17px] font-medium md:text-[17px]"
          />
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow(!show)}
            className="absolute top-2 right-2 h-[42px] rounded-full bg-chip px-3.5 text-sm font-semibold hover:bg-hover focus-visible:outline-2 focus-visible:outline-ring"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {problem && (
          <p id="demo-password-error" role="alert" className="text-sm font-semibold text-late">
            {problem}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-[58px] w-full text-[17px] font-bold"
        disabled={pending}
      >
        {pending ? "Opening…" : "Continue"}
      </Button>
    </form>
  );
}
