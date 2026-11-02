import { initialsOf } from "@/components/layout/account";
import { AVATAR_CLASSES, riskTone } from "@/components/shared/risk-tone";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

const SIZES = {
  md: "size-12 rounded-[14px] text-lg",
  lg: "size-[72px] rounded-[20px] text-[28px]",
} as const;

interface ClientAvatarProps {
  name: string;
  level: RiskLevel | null;
  size: keyof typeof SIZES;
}

// The client's initials on a tint that follows the late-payer level. The name is always written
// next to it, so the initials are hidden from assistive technology.
export function ClientAvatar({ name, level, size }: ClientAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center font-heading font-extrabold",
        SIZES[size],
        AVATAR_CLASSES[riskTone(level)],
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
