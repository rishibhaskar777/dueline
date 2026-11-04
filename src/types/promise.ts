// A date the client said they would pay by, noted by the freelancer. Dueline only reads it: nothing
// is sent or changed in PayPal because of it.
export interface PaymentPromise {
  promisedOn: string; // YYYY-MM-DD, India time
  note: string; // up to 200 characters, "" when there is none
  createdAt: string; // ISO timestamp
}
