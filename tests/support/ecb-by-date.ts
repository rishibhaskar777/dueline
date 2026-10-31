import { ecbRows } from "./rates";
import { jsonResponse } from "./http";

// Rupees per euro on each date; USD is 1.2 per euro in the shared rows, so USD = rupees / 1.2.
export function ecbByDate(rupeesPerEuro: Record<string, number>, fallback = 102) {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const date = new URL(String(input)).searchParams.get("date") ?? "";
    const inr = rupeesPerEuro[date] ?? fallback;
    return jsonResponse(
      ecbRows(date || "2026-10-29").map((row) =>
        (row as { quote: string }).quote === "INR" ? { ...(row as object), rate: inr } : row,
      ),
    );
  };
}
