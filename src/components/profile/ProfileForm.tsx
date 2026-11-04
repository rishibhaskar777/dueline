"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConnectPayPalCard } from "@/components/profile/ConnectPayPalCard";
import { ProfileFields } from "@/components/profile/ProfileFields";
import {
  toForm,
  validateProfile,
  type ProfileErrors,
  type ProfileField as FieldName,
  type ProfileFormValues,
} from "@/components/profile/profile-form";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
import { publishSavedProfile } from "@/components/profile/use-profile";
import { Button } from "@/components/ui/button";
import { saveProfile } from "@/lib/api-client";
import type { Profile } from "@/types";

export function ProfileForm({ initial }: { initial: Profile }) {
  const [form, setForm] = useState<ProfileFormValues>(() => toForm(initial));
  // A field shows its error once the user has left it, and every field after a save attempt.
  const [visited, setVisited] = useState<Set<FieldName>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const checked = validateProfile(form);
  const errors: ProfileErrors = checked.ok ? {} : checked.errors;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!checked.ok) return;

    setPending(true);
    setSaveError(null);
    try {
      const saved = await saveProfile(checked.profile);
      setForm(toForm(saved));
      publishSavedProfile(saved);
      toast.success("Profile saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="profile-title"
        className="surface grid gap-x-4 gap-y-[18px] p-7 max-md:p-5 sm:grid-cols-2 [--surface-radius:28px]"
      >
        <h2 id="profile-title" className="sr-only">
          Your business
        </h2>

        <ProfileFields
          form={form}
          errorOf={(field) => (submitted || visited.has(field) ? errors[field] : undefined)}
          onChange={(field, value) => {
            setForm({ ...form, [field]: value });
            setSaveError(null);
          }}
          onBlur={(field) => setVisited(new Set(visited).add(field))}
          onToggleHeadsUp={(sendHeadsUp) => {
            setForm({ ...form, sendHeadsUp });
            setSaveError(null);
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:col-span-2">
          {saveError && (
            <p role="alert" className="text-sm font-semibold text-late">
              {saveError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="px-[26px] font-bold">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      <aside aria-label="Invoice header and PayPal" className="grid gap-4">
        <ProfilePreview form={form} />
        <ConnectPayPalCard />
      </aside>
    </div>
  );
}
