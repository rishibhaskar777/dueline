"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ProfileFields } from "@/components/profile/ProfileFields";
import {
  toForm,
  validateProfile,
  type ProfileErrors,
  type ProfileField as FieldName,
  type ProfileFormValues,
} from "@/components/profile/profile-form";
import { ProfilePreview } from "@/components/profile/ProfilePreview";
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
      setForm(toForm(await saveProfile(checked.profile)));
      toast.success("Profile saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="profile-title"
        className="grid gap-5 rounded-xl border border-line bg-white p-6"
      >
        <div>
          <h2 id="profile-title" className="text-xl font-semibold">
            Your business
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used on every invoice and reminder Dueline sends for you.
          </p>
        </div>

        <ProfileFields
          form={form}
          errorOf={(field) => (submitted || visited.has(field) ? errors[field] : undefined)}
          onChange={(field, value) => {
            setForm({ ...form, [field]: value });
            setSaveError(null);
          }}
          onBlur={(field) => setVisited(new Set(visited).add(field))}
        />

        {saveError && (
          <p role="alert" className="text-sm text-late">
            {saveError}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <ProfilePreview form={form} />
    </div>
  );
}
