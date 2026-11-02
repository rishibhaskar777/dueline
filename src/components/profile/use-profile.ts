"use client";

import { useEffect, useState } from "react";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import { getProfile } from "@/lib/api-client";
import type { Profile } from "@/types";

interface ProfileState {
  // Null until the profile has loaded, and when it cannot be loaded.
  profile: Profile | null;
  error: LoadError | null;
  retry: () => void;
}

const savedListeners = new Set<(profile: Profile) => void>();

// The profile form announces what it saved, so the account menu shows the new name at once.
export function publishSavedProfile(profile: Profile): void {
  savedListeners.forEach((listener) => listener(profile));
}

export function useProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    savedListeners.add(setProfile);
    return () => {
      savedListeners.delete(setProfile);
    };
  }, []);

  useEffect(() => {
    let current = true;
    getProfile().then(
      (loaded) => {
        if (!current) return;
        setProfile(loaded);
        setError(null);
      },
      (failure: unknown) => current && setError(toLoadError(failure)),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  return { profile, error, retry: () => setAttempt((count) => count + 1) };
}
