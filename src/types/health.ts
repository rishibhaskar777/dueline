export interface HealthResponse {
  paypal: "connected" | "error";
  ai: "ready" | "missing_key";
  storage: "postgres" | "memory" | "error";
  mode: "sandbox";
  today: string;
  demoClock: boolean;
}
