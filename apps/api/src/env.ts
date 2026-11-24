/** Configuration from environment variables, checked once at startup. */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}. See apps/api/.env.example.`);
  return value;
}

const production = process.env.NODE_ENV === "production";

function storageConfig() {
  const driver = process.env.STORAGE || "local";
  if (driver !== "local" && driver !== "r2") throw new Error(`STORAGE must be "local" or "r2", not "${driver}".`);
  const r2 = driver === "r2";
  const read = (name: string): string => (r2 ? required(name) : "");
  return {
    driver: driver as "local" | "r2",
    r2: { accountId: read("R2_ACCOUNT_ID"), accessKeyId: read("R2_ACCESS_KEY_ID"), secretAccessKey: read("R2_SECRET_ACCESS_KEY"), bucket: read("R2_BUCKET"), publicUrl: read("R2_PUBLIC_URL") },
  };
}

export const env = {
  production,
  databaseUrl: required("DATABASE_URL", production ? undefined : "postgres://pitchkh:pitchkh@localhost:5432/pitchkh"),
  port: Number(process.env.PORT ?? 8000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean),
  // A fixed dev secret keeps local sessions working across restarts; production must set its own.
  jwtSecret: required("JWT_SECRET", production ? undefined : "dev-only-secret-change-me-dev-only-secret"),
  /** Where the web app lives (password reset links point there). */
  webUrl: (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  /** This API's own public URL (photo links). */
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 8000}`).replace(/\/+$/, ""),
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  /** Venue photos: "local" disk (default) or Cloudflare "r2". With r2, every R2_* value must be set. */
  storage: storageConfig(),
  mail: { resendKey: process.env.RESEND_API_KEY ?? "", from: process.env.MAIL_FROM ?? "PitchKH <no-reply@pitchkh.app>" },
  payments: {
    // Only "sandbox" exists today. A real provider (Bakong KHQR, ABA PayWay) plugs in behind src/payments.ts.
    provider: process.env.PAYMENT_PROVIDER ?? "sandbox",
    webhookSecret: required("PAYMENT_WEBHOOK_SECRET", production ? undefined : "dev-payment-webhook-secret"),
    bakong: {
      token: process.env.BAKONG_TOKEN ?? "",
      accountId: process.env.BAKONG_ACCOUNT_ID ?? "",
      merchantName: process.env.BAKONG_MERCHANT_NAME ?? "PitchKH",
      merchantCity: process.env.BAKONG_MERCHANT_CITY ?? "Phnom Penh",
      apiUrl: process.env.BAKONG_API_URL ?? "https://api-bakong.nbc.gov.kh",
    },
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    username: process.env.TELEGRAM_BOT_USERNAME ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  },
};
