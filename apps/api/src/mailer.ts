/**
 * Sends account emails. Without RESEND_API_KEY the email is printed to the
 * server log (fine for development); with it, Resend delivers it.
 */
export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export function createMailer(resendKey: string, from: string, fetchImpl: typeof fetch = fetch): Mailer {
  if (!resendKey) {
    return {
      async send(to, subject, text) {
        console.log(`[mail to ${to}] ${subject}\n${text}`);
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
