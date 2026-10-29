import type { z } from "zod";
import type {
  ActivityResponse,
  ApiError,
  ClientRisk,
  CreateInvoiceResponse,
  ExportRegister,
  ExtractResponse,
  HealthResponse,
  InvoicesResponse,
  Money,
  PayoutEstimate,
  PurposeCodesResponse,
  ReminderDraft,
  RemindersResponse,
  SendInvoiceResponse,
  SendReminderResponse,
  Settings,
  Tone,
  createInvoiceRequestSchema,
  sendReminderRequestSchema,
} from "@/types";

export type CreateInvoiceInput = z.infer<typeof createInvoiceRequestSchema>;
export type SendReminderInput = z.infer<typeof sendReminderRequestSchema>;

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

export function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResponse> {
  return requestJson("/api/invoices", jsonInit("POST", input));
}

export function sendInvoiceDraft(id: string, requestId: string): Promise<SendInvoiceResponse> {
  return requestJson(
    `/api/invoices/${encodeURIComponent(id)}/send`,
    jsonInit("POST", { requestId }),
  );
}

export function getClientRisk(email: string): Promise<ClientRisk> {
  return requestJson(`/api/clients/risk?email=${encodeURIComponent(email)}`);
}

export async function getReminders(): Promise<ReminderDraft[]> {
  const { drafts } = await requestJson<RemindersResponse>("/api/reminders");
  return drafts;
}

export function draftReminder(invoiceId: string, tone: Tone): Promise<ReminderDraft> {
  return requestJson("/api/reminders/draft", jsonInit("POST", { invoiceId, tone }));
}

export function sendReminder(input: SendReminderInput): Promise<SendReminderResponse> {
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

export function getExportRegister(month: string): Promise<ExportRegister> {
  return requestJson(`/api/export-register?month=${encodeURIComponent(month)}`);
}

export function exportRegisterCsvUrl(month: string): string {
  return `/api/export-register?month=${encodeURIComponent(month)}&format=csv`;
}

export async function resetDemo(): Promise<void> {
  await request("/api/demo/reset", { method: "POST" });
}

export async function signIn(password: string): Promise<void> {
  await request(SESSION_PATH, jsonInit("POST", { password }));
}

export async function signOut(): Promise<void> {
  await request(SESSION_PATH, { method: "DELETE" });
}
