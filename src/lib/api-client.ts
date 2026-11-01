import type {
  ActivityResponse,
  AnnualSummary,
  ApiError,
  BankReferenceResponse,
  CancelInvoiceResponse,
  ClientDetail,
  ClientLanguageResponse,
  ClientNotesResponse,
  ClientRisk,
  ClientSummary,
  ClientsResponse,
  DailyDigest,
  DailyRunResponse,
  DashboardResponse,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  DemoRecipientResponse,
  DemoResetResponse,
  ExportRegister,
  ExtractResponse,
  HealthResponse,
  HiddenInvoiceResponse,
  InvoiceDetailResponse,
  InvoicesResponse,
  LibraryItem,
  LibraryItemsResponse,
  Money,
  PaymentMethod,
  PayoutEstimate,
  Profile,
  PurposeCodesResponse,
  QueueItem,
  QueueResponse,
  RateAlertsResponse,
  ReminderDraft,
  ReminderLanguage,
  RepeatSchedule,
  RepeatsResponse,
  RecordPaymentResponse,
  RemindersResponse,
  SendInvoiceResponse,
  SendReminderRequest,
  SendReminderResponse,
  Settings,
  Tone,
  TriggeredRateAlert,
} from "@/types";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly debugId?: string;

  constructor(status: number, code: string, message: string, debugId?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.debugId = debugId;
  }
}

async function toError(response: Response): Promise<ApiClientError> {
  try {
    const body = (await response.json()) as ApiError;
    const { code, message, debugId } = body.error;
    return new ApiClientError(response.status, code, message, debugId);
  } catch {
    return new ApiClientError(
      response.status,
      "unexpected_response",
      "Something went wrong. Try again in a moment.",
    );
  }
}

const SESSION_PATH = "/api/demo/session";

function signInUrl(): string {
  const { pathname, search } = window.location;
  return `/demo?next=${encodeURIComponent(`${pathname}${search}`)}`;
}

// A full page load, because this runs outside React and the page's data is no longer allowed.
function sendToSignIn(): void {
  if (typeof window === "undefined" || window.location.pathname === "/demo") return;
  window.location.assign(signInUrl());
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, init);
  if (response.ok) return response;

  const error = await toError(response);
  if (error.code === "unauthorized" && path !== SESSION_PATH) sendToSignIn();
  throw error;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  return (await response.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function getHealth(): Promise<HealthResponse> {
  return requestJson("/api/health");
}

export function getInvoices(): Promise<InvoicesResponse> {
  return requestJson("/api/invoices");
}

export function extractInvoice(chat: string): Promise<ExtractResponse> {
  return requestJson("/api/invoices/extract", jsonInit("POST", { chat }));
}

export function estimatePayout(amount: Money): Promise<PayoutEstimate> {
  return requestJson("/api/payout-estimate", jsonInit("POST", { amount }));
}

export function createInvoice(input: CreateInvoiceRequest): Promise<CreateInvoiceResponse> {
  return requestJson("/api/invoices", jsonInit("POST", input));
}

export function sendInvoiceDraft(id: string, requestId: string): Promise<SendInvoiceResponse> {
  return requestJson(
    `/api/invoices/${encodeURIComponent(id)}/send`,
    jsonInit("POST", { requestId }),
  );
}

export function getInvoiceDetail(id: string): Promise<InvoiceDetailResponse> {
  return requestJson(`/api/invoices/${encodeURIComponent(id)}`);
}

export function cancelInvoice(
  id: string,
  input: { requestId: string; notifyClient: boolean },
): Promise<CancelInvoiceResponse> {
  return requestJson(`/api/invoices/${encodeURIComponent(id)}/cancel`, jsonInit("POST", input));
}

export function recordPayment(
  id: string,
  input: { requestId: string; method: PaymentMethod; paidOn: string; note?: string },
): Promise<RecordPaymentResponse> {
  return requestJson(
    `/api/invoices/${encodeURIComponent(id)}/record-payment`,
    jsonInit("POST", input),
  );
}

export function getDashboard(): Promise<DashboardResponse> {
  return requestJson("/api/dashboard");
}

export async function getClients(): Promise<ClientSummary[]> {
  const { clients } = await requestJson<ClientsResponse>("/api/clients");
  return clients;
}

export function getClientDetail(key: string): Promise<ClientDetail> {
  return requestJson(`/api/clients/by-key/${encodeURIComponent(key)}`);
}

export async function saveClientNotes(
  key: string,
  notes: string,
): Promise<ClientNotesResponse["notes"]> {
  const saved = await requestJson<ClientNotesResponse>(
    `/api/clients/by-key/${encodeURIComponent(key)}/notes`,
    jsonInit("PUT", { notes }),
  );
  return saved.notes;
}

export async function saveClientLanguage(
  key: string,
  language: ReminderLanguage,
): Promise<ClientLanguageResponse["language"]> {
  const saved = await requestJson<ClientLanguageResponse>(
    `/api/clients/by-key/${encodeURIComponent(key)}/language`,
    jsonInit("PUT", { language }),
  );
  return saved.language;
}

export function getClientRisk(email: string, name?: string): Promise<ClientRisk> {
  const query = new URLSearchParams(name ? { email, name } : { email });
  return requestJson(`/api/clients/risk?${query}`);
}

export function getReminders(): Promise<RemindersResponse> {
  return requestJson("/api/reminders");
}

export function draftReminder(
  invoiceId: string,
  tone: Tone,
  language?: ReminderLanguage,
): Promise<ReminderDraft> {
  return requestJson(
    "/api/reminders/draft",
    jsonInit("POST", { invoiceId, tone, ...(language ? { language } : {}) }),
  );
}

export function sendReminder(input: SendReminderRequest): Promise<SendReminderResponse> {
  return requestJson("/api/reminders/send", jsonInit("POST", input));
}

export async function getActivity(): Promise<ActivityResponse["events"]> {
  const { events } = await requestJson<ActivityResponse>("/api/activity");
  return events;
}

export function getSettings(): Promise<Settings> {
  return requestJson("/api/settings");
}

export function saveSettings(settings: Settings): Promise<Settings> {
  return requestJson("/api/settings", jsonInit("PUT", settings));
}

export async function getPurposeCodes(): Promise<PurposeCodesResponse["codes"]> {
  const { codes } = await requestJson<PurposeCodesResponse>("/api/purpose-codes");
  return codes;
}

export async function getDemoRecipient(): Promise<DemoRecipientResponse["email"]> {
  const { email } = await requestJson<DemoRecipientResponse>("/api/demo/recipient");
  return email;
}

export function getProfile(): Promise<Profile> {
  return requestJson("/api/profile");
}

export function saveProfile(profile: Profile): Promise<Profile> {
  return requestJson("/api/profile", jsonInit("PUT", profile));
}

export function getAnnualSummary(fy: string): Promise<AnnualSummary> {
  return requestJson(`/api/exports/annual?fy=${encodeURIComponent(fy)}`);
}

export function annualSummaryCsvUrl(fy: string): string {
  return `/api/exports/annual?fy=${encodeURIComponent(fy)}&format=csv`;
}

export function gstr1CsvUrl(month: string): string {
  return `/api/exports/gstr1?month=${encodeURIComponent(month)}&format=csv`;
}

export function getExportRegister(month: string): Promise<ExportRegister> {
  return requestJson(`/api/export-register?month=${encodeURIComponent(month)}`);
}

export function exportRegisterCsvUrl(month: string): string {
  return `/api/export-register?month=${encodeURIComponent(month)}&format=csv`;
}

export async function saveBankReference(
  invoiceId: string,
  reference: string,
): Promise<BankReferenceResponse["reference"]> {
  const saved = await requestJson<BankReferenceResponse>(
    "/api/export-register/bank-reference",
    jsonInit("PUT", { invoiceId, reference }),
  );
  return saved.reference;
}

export function setInvoiceHidden(
  invoiceId: string,
  hidden: boolean,
): Promise<HiddenInvoiceResponse> {
  return requestJson("/api/demo/hidden-invoices", jsonInit("POST", { invoiceId, hidden }));
}

export function resetDemo(): Promise<DemoResetResponse> {
  return requestJson("/api/demo/reset", { method: "POST" });
}

export function runDailyPreparation(): Promise<DailyRunResponse> {
  return requestJson("/api/demo/prepare", { method: "POST" });
}

export async function getQueue(): Promise<QueueItem[]> {
  const { items } = await requestJson<QueueResponse>("/api/queue");
  return items;
}

export async function dismissQueueItem(id: string): Promise<void> {
  await request(`/api/queue/${encodeURIComponent(id)}/dismiss`, { method: "POST" });
}

export function getDigest(): Promise<DailyDigest> {
  return requestJson("/api/digest");
}

export async function getRateAlerts(): Promise<TriggeredRateAlert[]> {
  const { alerts } = await requestJson<RateAlertsResponse>("/api/rate-alerts");
  return alerts;
}

export async function getRepeats(clientKey?: string): Promise<RepeatSchedule[]> {
  const query = clientKey ? `?client=${encodeURIComponent(clientKey)}` : "";
  const { repeats } = await requestJson<RepeatsResponse>(`/api/repeats${query}`);
  return repeats;
}

export function createRepeat(input: {
  invoiceId: string;
  dayOfMonth: number;
  requestId: string;
}): Promise<RepeatSchedule> {
  return requestJson("/api/repeats", jsonInit("POST", input));
}

export function setRepeatPaused(id: string, paused: boolean): Promise<RepeatSchedule> {
  return requestJson(`/api/repeats/${encodeURIComponent(id)}`, jsonInit("PATCH", { paused }));
}

export async function deleteRepeat(id: string): Promise<void> {
  await request(`/api/repeats/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getLibraryItems(): Promise<LibraryItem[]> {
  const { items } = await requestJson<LibraryItemsResponse>("/api/items");
  return items;
}

export function saveLibraryItem(
  item: Omit<LibraryItem, "id"> & { id?: string },
): Promise<LibraryItem> {
  return requestJson("/api/items", jsonInit("POST", item));
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await request(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function signIn(password: string): Promise<void> {
  await request(SESSION_PATH, jsonInit("POST", { password }));
}

export async function signOut(): Promise<void> {
  await request(SESSION_PATH, { method: "DELETE" });
}
