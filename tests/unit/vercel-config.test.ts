import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as {
  regions?: unknown;
  crons?: { path: string; schedule: string }[];
};

describe("vercel.json", () => {
  it("pins functions to Singapore, next to the database", () => {
    expect(config.regions).toEqual(["sin1"]);
  });

  it("starts the daily preparation once a day at 06:00 India time", () => {
    expect(config.crons).toEqual([{ path: "/api/cron/daily", schedule: "30 0 * * *" }]);
  });

  it("schedules nothing more often than the free plan allows", () => {
    for (const { schedule } of config.crons ?? []) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(" ");
      expect(minute).toMatch(/^\d+$/);
      expect(hour).toMatch(/^\d+$/);
      expect([dayOfMonth, month, dayOfWeek].join(" ")).toBe("* * *");
    }
  });
});
