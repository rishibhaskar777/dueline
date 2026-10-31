import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileScreen } from "@/components/profile/ProfileScreen";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        intro="Your name, business and GST details, printed on every invoice and reminder."
      />
      <ProfileScreen />
    </>
  );
}
