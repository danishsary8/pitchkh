/**
 * Bakong KHQR payments (National Bank of Cambodia). Every Cambodian banking
 * app (ABA, ACLEDA, Wing...) can scan a KHQR, so all online methods use it.
 *
 * Bakong has no webhook to merchants: we ask its Open API whether the QR (by
 * its md5) has been paid, while the player waits and in a background job.
 */
import { BakongKHQR, IndividualInfo, khqrData } from "bakong-khqr";
import type { PaymentProvider } from "./payments";

export interface BakongConfig {
  /** Open API token from https://api-bakong.nbc.gov.kh (renew it about every 90 days). */
  token: string;
  /** Where the money goes, e.g. "yourname@aclb". */
  accountId: string;
  merchantName: string;
  merchantCity: string;
  apiUrl: string;
  fetch?: typeof fetch;
}

interface CheckResponse {
  responseCode: number;
  data?: { toAccountId?: string; amount?: number; currency?: string } | null;
}

export function bakongProvider(config: BakongConfig): PaymentProvider {
  const doFetch = config.fetch ?? fetch;
  return {
    name: "bakong",
    canSimulate: false,
    async createIntent(booking) {
      const due = booking.paymentDueAt ? Date.parse(booking.paymentDueAt) : Date.now() + 10 * 60_000;
      const info = new IndividualInfo(config.accountId, config.merchantName.slice(0, 25), config.merchantCity.slice(0, 15), {
        currency: khqrData.currency.usd,
        amount: booking.price.totalUsd,
        billNumber: booking.code,
        storeLabel: "PitchKH",
        expirationTimestamp: due,
      });
      const result = new BakongKHQR().generateIndividual(info);
      if (result.status.code !== 0 || !result.data) throw new Error(`KHQR generation failed: ${result.status.message ?? result.status.errorCode}`);
      // The md5 of the QR is how Bakong finds the transaction later.
      return { reference: result.data.md5, qrPayload: result.data.qr, deeplink: null };
    },
    verifyWebhook: () => null,
    async checkPaid(reference, expected) {
      const res = await doFetch(`${config.apiUrl.replace(/\/+$/, "")}/v1/check_transaction_by_md5`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
        body: JSON.stringify({ md5: reference }),
      });
      if (!res.ok) throw new Error(`Bakong check failed: ${res.status}`);
      const body = (await res.json()) as CheckResponse;
      if (body.responseCode !== 0 || !body.data) return false; // not paid (yet)
      // Only count it if the right amount reached the right account.
      return (!body.data.toAccountId || body.data.toAccountId === config.accountId) && (body.data.amount ?? 0) + 0.001 >= expected.amountUsd && (!body.data.currency || body.data.currency === "USD");
    },
  };
}
