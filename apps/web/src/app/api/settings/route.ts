import { getDb, settings, encryptSecret, decryptSecret, isEncryptedSecret } from "@perf-test/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession } from "@/lib/auth";
import { updateSettingsSchema, settingsCategorySchema } from "@/lib/validation";
import { validateBody, validateQuery } from "@/lib/api-utils";

const SENSITIVE_KEYS = [
  "password",
  "apiToken",
  "token",
  "api_key",
  "apiToken",
  "jenkinsToken",
  "sshPrivateKey",
  "sshPrivateKeyPath",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s.toLowerCase()));
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (session instanceof NextResponse) return session;
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const query = validateQuery(settingsCategorySchema, searchParams);
    if (!query.success) return query.response;
    const { category } = query.data;

    let allSettings;
    if (category) {
      allSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.category, category));
    } else {
      allSettings = await db.select().from(settings);
    }

    // Group by category
    const grouped: Record<string, Record<string, unknown>> = {};
    for (const setting of allSettings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      const rawValue = typeof setting.value === "string"
        ? setting.value
        : JSON.stringify(setting.value);
      const maybeDecrypted = isEncryptedSecret(rawValue)
        ? "***"
        : rawValue;

      grouped[setting.category][setting.key] = isSensitiveKey(setting.key)
        ? "***"
        : maybeDecrypted;
    }

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;
    const db = getDb();
    const body = await request.json();
    const validation = validateBody(updateSettingsSchema, body);
    if (!validation.success) return validation.response;
    const { category, settings: settingsData } = validation.data;

    const settingsMap: Record<string, unknown> = {};
    for (const item of settingsData) {
      settingsMap[item.key] = item.value;
    }

    for (const [key, value] of Object.entries(settingsMap)) {
      const stringValue = JSON.stringify(value);
      const storedValue = isSensitiveKey(key)
        ? JSON.stringify(encryptSecret(String(value ?? "")))
        : stringValue;

      const [existing] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.category, category), eq(settings.key, key)))
        .limit(1);

      if (existing) {
        await db
          .update(settings)
          .set({ value: storedValue, updatedAt: new Date() })
          .where(eq(settings.id, existing.id));
      } else {
        await db.insert(settings).values({
          category,
          key,
          value: storedValue,
        });
      }
    }

    return NextResponse.json({ success: true, message: "Settings updated" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
