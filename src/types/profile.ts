export interface Profile {
  yourName: string;
  businessName: string;
  gstin: string | null;
  lutArn: string | null;
  lutValidUntil: string | null;
  defaultSac: string | null;
  website: string | null;
  address: string | null; // printed on the tax invoice; not sent to PayPal
  signOff: string;
  sendHeadsUp: boolean; // Nudges offers a friendly note before an invoice is due
  headsUpDays: number; // 1 to 7: how many days before the due date
}

export const EMPTY_PROFILE: Profile = {
  yourName: "",
  businessName: "",
  gstin: null,
  lutArn: null,
  lutValidUntil: null,
  defaultSac: null,
  website: null,
  address: null,
  signOff: "Thank you",
  sendHeadsUp: true,
  headsUpDays: 3,
};
