import "server-only";
import { evaluateRateAlerts } from "@/lib/automation/rate-alerts";
import { today } from "@/lib/clock";
import { financialYearOf } from "@/lib/date-math";
import { loadClientGroups } from "@/lib/clients/clients";
import { buildAnnualSummary } from "@/lib/export/annual";
import { getRatesWidget } from "@/lib/rates/rates";
import { getSettingsAndRates } from "@/lib/settings";
import type { DashboardResponse } from "@/types";
import { feesLostFrom } from "./fees-lost";
import { buildForecast } from "./forecast";
import { lateClients, upcomingDue } from "./upcoming";

export async function buildDashboard(): Promise<DashboardResponse> {
  const date = today();
  const [groups, annual, { settings }] = await Promise.all([
    loadClientGroups(),
    buildAnnualSummary(financialYearOf(date.slice(0, 7))),
    getSettingsAndRates(),
  ]);
  const inputs = groups.flatMap(({ invoices, score }) =>
    invoices.map((invoice) => ({ invoice, averageDaysLate: score.averageDaysLate })),
  );

  return {
    forecast: buildForecast(inputs, date),
    feesLost: feesLostFrom(annual),
    upcomingDue: upcomingDue(
      inputs.map(({ invoice }) => invoice),
      date,
    ),
    lateClients: lateClients(groups),
    rates: await getRatesWidget(settings),
    rateAlerts: evaluateRateAlerts(settings.rateAlerts, settings.marketRates),
  };
}
