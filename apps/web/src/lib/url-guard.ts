const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1"];

export function validateAllowedUrl(rawUrl: string): { ok: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const allowed = (process.env.INTERNAL_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const allowlist = allowed.length > 0 ? allowed : DEFAULT_ALLOWED_HOSTS;
  const hostname = parsed.hostname.toLowerCase();

  if (!allowlist.includes(hostname)) {
    return { ok: false, error: "Host not allowed" };
  }

  return { ok: true };
}
