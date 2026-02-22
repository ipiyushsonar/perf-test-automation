import { getDb } from "@perf-test/db";
import { versions } from "@perf-test/db";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDb();
    const allVersions = await db
      .select()
      .from(versions)
      .orderBy(desc(versions.createdAt));
    return NextResponse.json({ success: true, data: allVersions });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const [result] = await db
      .insert(versions)
      .values({
        version: body.version,
        displayName: body.displayName,
        description: body.description,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
      })
      .returning();

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
