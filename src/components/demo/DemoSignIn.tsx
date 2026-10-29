"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, signIn } from "@/lib/api-client";
import { safeNextPath } from "@/lib/demo-access/next-path";

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
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setProblem(null);
    try {
      await signIn(password);
      window.location.assign(next);
    } catch (error) {
      setProblem(messageFor(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <h1 className="text-xl font-semibold">Enter the demo password</h1>
      <div className="grid gap-1.5">
        <Label htmlFor="demo-password">Demo password</Label>
        <Input
          id="demo-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={problem !== null}
          aria-describedby={problem ? "demo-password-error" : undefined}
        />
        {problem && (
          <p id="demo-password-error" role="alert" className="text-sm text-late">
            {problem}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="h-10" disabled={pending || password === ""}>
        {pending ? "Opening…" : "Open the demo"}
      </Button>
    </form>
  );
}
