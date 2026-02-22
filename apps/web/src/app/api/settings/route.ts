import { getDb } from "@perf-test/db";
import { settings } from "@perf-test/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

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
      grouped[setting.category][setting.key] = setting.value;
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
    const db = getDb();
    const body = await request.json();
    const { category, settings: settingsData } = body as {
      category: string;
      settings: Record<string, unknown>;
    };

    for (const [key, value] of Object.entries(settingsData)) {
      const [existing] = await db
        .select()
        .from(settings)
        .where(and(eq(settings.category, category), eq(settings.key, key)))
        .limit(1);

      if (existing) {
        await db
          .update(settings)
          .set({ value: JSON.stringify(value), updatedAt: new Date() })
          .where(eq(settings.id, existing.id));
      } else {
        await db.insert(settings).values({
          category,
          key,
          value: JSON.stringify(value),
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
