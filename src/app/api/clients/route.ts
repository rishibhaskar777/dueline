import { connection } from "next/server";
import { listClients } from "@/lib/clients/clients";
import type { ClientsResponse } from "@/types";
import { failFromError } from "@/app/api/_lib/errors";
import { ok } from "@/app/api/_lib/respond";

export async function GET(): Promise<Response> {
  await connection();
  try {
    return ok<ClientsResponse>({ clients: await listClients() });
  } catch (error) {
    return failFromError(error);
  }
}
