import { ProfileField } from "@/components/profile/ProfileField";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import type {
  ProfileField as FieldName,
  ProfileFormValues,
} from "@/components/profile/profile-form";

const EXAMPLE_SACS = [
  ["998314", "IT design and development"],
  ["998361", "advertising services"],
  ["998391", "specialty design services"],
] as const;

interface ProfileFieldsProps {
  form: ProfileFormValues;
  errorOf: (field: FieldName) => string | undefined;
  onChange: (field: FieldName, value: string) => void;
  onBlur: (field: FieldName) => void;
  onToggleHeadsUp: (on: boolean) => void;
}

export function ProfileFields({
  form,
  errorOf,
  onChange,
  onBlur,
  onToggleHeadsUp,
}: ProfileFieldsProps) {
  const bind = (field: FieldName, upper = false) => ({
    id: `profile-${field}`,
    value: form[field],
    error: errorOf(field),
    onChange: (value: string) => onChange(field, upper ? value.toUpperCase() : value),
    onBlur: () => onBlur(field),
  });

  return (
    <>
      <ProfileField
        {...bind("yourName")}
        label="Your name"
        maxLength={60}
        help="Used to sign reminders."
      />
      <ProfileField
        {...bind("businessName")}
        label="Business name"
        maxLength={120}
        help="Shown at the top of every invoice."
      />
      <ProfileField
        {...bind("gstin", true)}
        label="GSTIN"
        wide
        maxLength={15}
        help="15 characters: your state code, your PAN, then a letter, Z and a check character. Leave it empty if you are not registered for GST."
      />
      <ProfileField
        {...bind("lutArn", true)}
        label="LUT ARN"
        maxLength={15}
        help="The reference number of your Letter of Undertaking (form GST RFD-11). 15 letters and digits."
      />
      <ProfileField
        {...bind("lutValidUntil")}
        label="LUT valid until"
        type="date"
        help="Usually 31 March."
      />
      <ProfileField
        {...bind("defaultSac")}
        label="Default SAC"
        inputMode="numeric"
        maxLength={6}
        help={
          <>
            The services code for your work: 6 digits starting with 99. Examples:{" "}
            {EXAMPLE_SACS.map(([code, name], index) => (
              <span key={code}>
                {index > 0 && "; "}
                <span className="tabular-nums">{code}</span> {name}
              </span>
            ))}
            .
          </>
        }
      />
      <ProfileField
        {...bind("signOff")}
        label="Sign-off"
        maxLength={40}
        help="The closing line of every reminder, followed by your name."
      />
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <div className="grid gap-0.5">
          <span className="font-bold">Send a heads-up before the due date</span>
          <span className="text-sm text-muted-foreground">
            Nudges lists a friendly note for an invoice that is about to fall due. Turn it off to
            hide that list.
          </span>
        </div>
        <ToggleSwitch
          label="Send a heads-up before the due date"
          checked={form.sendHeadsUp}
          onChange={onToggleHeadsUp}
        />
      </div>
      {form.sendHeadsUp && (
        <ProfileField
          {...bind("headsUpDays")}
          label="Days before"
          inputMode="numeric"
          maxLength={1}
          help="1 to 7 days before the due date. The due date itself counts."
        />
      )}
      <ProfileField
        {...bind("website")}
        label="Website"
        wide
        maxLength={200}
        placeholder="https://"
        help="Optional. Printed under your business name on invoices."
      />
      <ProfileField
        {...bind("address")}
        label="Business address"
        wide
        maxLength={200}
        help="Optional. Printed on the downloadable tax invoice, where GST Rule 46 asks for the supplier's address."
      />
    </>
  );
}
