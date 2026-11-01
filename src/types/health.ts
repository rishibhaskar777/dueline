export interface HealthResponse {
  paypal: "connected" | "error";
  ai: "ready" | "missing_key";
  storage: "postgres" | "memory" | "error";
  mode: "sandbox";
  offline: boolean;
  today: string;
  demoClock: boolean;
}
