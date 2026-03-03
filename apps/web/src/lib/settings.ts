import { getDb, settings, decryptSecret, isEncryptedSecret } from "@perf-test/db";
import { eq } from "drizzle-orm";

export async function getSettingsCategory(category: string): Promise<Record<string, unknown>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.category, category));

  const config: Record<string, unknown> = {};
  for (const row of rows) {
    const rawValue = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
    const parsedValue = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
    if (typeof parsedValue === "string" && isEncryptedSecret(parsedValue)) {
      config[row.key] = decryptSecret(parsedValue);
    } else {
      config[row.key] = parsedValue;
    }
  }

  return config;
}
