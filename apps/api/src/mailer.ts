import { log } from "./observability";

/**
 * Sends account emails through Resend. Without RESEND_API_KEY: in development
 * the email is printed to the log; in production nothing is sent and only a
 * warning is logged (never the body, which holds single-use reset links).
 */
export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export function createMailer(resendKey: string, from: string, fetchImpl: typeof fetch = fetch, production = false): Mailer {
  if (!resendKey) {
    return {
      async send(to, subject, text) {
        if (production) log("warn", "email not sent: RESEND_API_KEY is not set", { subject });
        else console.log(`[mail to ${to}] ${subject}\n${text}`);
      },
    };
  }
  return {
    async send(to, subject, text) {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Email failed: ${res.status}`);
    },
  };
}

export function resetEmail(locale: string, link: string): { subject: string; text: string } {
  return locale === "km"
    ? { subject: "កំណត់ពាក្យសម្ងាត់ PitchKH ឡើងវិញ", text: `ចុចតំណនេះ ដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មី (មានសុពលភាព ៣០ នាទី):\n${link}\n\nបើអ្នកមិនបានស្នើ សូមមិនអើពើអ៊ីមែលនេះ។` }
    : { subject: "Reset your PitchKH password", text: `Open this link to choose a new password (valid for 30 minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.` };
}
