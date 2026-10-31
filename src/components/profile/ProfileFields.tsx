import { ProfileField } from "@/components/profile/ProfileField";
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
}

export function ProfileFields({ form, errorOf, onChange, onBlur }: ProfileFieldsProps) {
  const bind = (field: FieldName, upper = false) => ({
    id: `profile-${field}`,
    value: form[field],
    error: errorOf(field),
    onChange: (value: string) => onChange(field, upper ? value.toUpperCase() : value),
    onBlur: () => onBlur(field),
  });

  return (
    <>
      <ProfileField {...bind("yourName")} label="Your name" maxLength={60} />
      <ProfileField {...bind("businessName")} label="Business name" maxLength={120} />
      <ProfileField
        {...bind("gstin", true)}
        label="GSTIN"
        maxLength={15}
        help="15 characters: your state code, your PAN, then a letter, Z and a check character. Leave it empty if you are not registered for GST."
      />
      <div className="flex flex-wrap gap-4">
        <ProfileField
          {...bind("lutArn", true)}
          label="LUT ARN"
          maxLength={15}
          className="w-56"
          help="The reference number of your Letter of Undertaking (form GST RFD-11). 15 letters and digits."
        />
        <ProfileField
          {...bind("lutValidUntil")}
          label="LUT valid until"
          type="date"
          className="w-44"
          help="Usually 31 March."
        />
      </div>
      <ProfileField
        {...bind("defaultSac")}
        label="Default SAC"
        inputMode="numeric"
        maxLength={6}
        className="w-32"
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
      <ProfileField {...bind("website")} label="Website" maxLength={200} placeholder="https://" />
      <ProfileField
        {...bind("signOff")}
        label="Reminder sign-off"
        maxLength={40}
        help="Ends every reminder, followed by your name."
      />
    </>
  );
}
