import { createHmac } from "node:crypto";

/** Builds Mini App `initData` signed the way Telegram signs it. Test helper only. */
export function signInitData(user: { id: number; username?: string }, botToken: string, authDateSeconds = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(authDateSeconds)),
    query_id: "test",
    user: JSON.stringify({ id: user.id, first_name: "Dara", ...(user.username ? { username: user.username } : {}) }),
  });
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}
