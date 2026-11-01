"use client";

import { LibraryManager } from "@/components/library/LibraryManager";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { useProfile } from "@/components/profile/use-profile";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock";

export function ProfileScreen() {
  const { profile, error, retry } = useProfile();

  if (profile) {
    return (
      <div className="grid gap-6">
        <ProfileForm initial={profile} />
        <LibraryManager />
      </div>
    );
  }
  if (error)
    return <LoadFailure title="Couldn't load your profile" error={error} onRetry={retry} />;
  return <SkeletonBlock className="h-96" />;
}
