import { estimatePayout } from "@/lib/money/payout";
import { getSettingsAndRates } from "@/lib/settings";
import { payoutEstimateRequestSchema } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";
import { parseBody } from "@/app/api/_lib/validate";

export async function POST(req: Request): Promise<Response> {
  const parsed = await parseBody(req, payoutEstimateRequestSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { amount } = parsed.data;
    const { settings, market } = await getSettingsAndRates();
    return ok(
      estimatePayout(amount, settings, {
        value: market.rates[amount.currency],
        onDate: market.onDate,
        source: market.source,
      }),
    );
  } catch (error) {
    return failFromError(error);
  }
}
