export const SANDBOX_BUYER_DOMAIN = "@personal.example.com";

// PayPal sandbox buyers have generated addresses nobody should have to read. The address itself
// stays in the data, in links and in the APIs; this is only for what a person sees.
export function displayEmail(email: string): string {
  return email.toLowerCase().endsWith(SANDBOX_BUYER_DOMAIN) ? "PayPal sandbox buyer" : email;
}
