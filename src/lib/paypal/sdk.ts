import "server-only";
import {
  Client,
  Environment,
  PaymentsController,
  TransactionSearchController,
} from "@paypal/paypal-server-sdk";
import { getEnv } from "@/lib/env";
import { REQUEST_TIMEOUT_MS } from "./http";

let client: Client | undefined;

function sdkClient(): Client {
  if (!client) {
    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = getEnv();
    client = new Client({
      environment: Environment.Sandbox,
      timeout: REQUEST_TIMEOUT_MS,
      clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
      },
    });
  }
  return client;
}

export function paymentsController(): PaymentsController {
  return new PaymentsController(sdkClient());
}

export function transactionSearchController(): TransactionSearchController {
  return new TransactionSearchController(sdkClient());
}
