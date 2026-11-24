/** Configuration from environment variables, checked once at startup. */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}. See apps/api/.env.example.`);
  return value;
}

const production = process.env.NODE_ENV === "production";

export const env = {
  production,
  databaseUrl: required("DATABASE_URL", production ? undefined : "postgres://pitchkh:pitchkh@localhost:5432/pitchkh"),
  port: Number(process.env.PORT ?? 8000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean),
  // A fixed dev secret keeps local sessions working across restarts; production must set its own.
  jwtSecret: required("JWT_SECRET", production ? undefined : "dev-only-secret-change-me-dev-only-secret"),
  payments: {
    // Only "sandbox" exists today. A real provider (Bakong KHQR, ABA PayWay) plugs in behind src/payments.ts.
    provider: process.env.PAYMENT_PROVIDER ?? "sandbox",
    webhookSecret: required("PAYMENT_WEBHOOK_SECRET", production ? undefined : "dev-payment-webhook-secret"),
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    username: process.env.TELEGRAM_BOT_USERNAME ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  },
};
