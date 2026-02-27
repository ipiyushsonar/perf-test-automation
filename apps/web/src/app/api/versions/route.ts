import { getDb } from "@perf-test/db";
import { versions } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { createVersionSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const db = getDb();
    const allVersions = await db
      .select()
      .from(versions)
      .orderBy(desc(versions.createdAt));
    return successResponse(allVersions);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const validation = validateBody(createVersionSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const [result] = await db
      .insert(versions)
      .values({
        version: data.version,
        displayName: data.displayName,
        description: data.description,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
      })
      .returning();

    return successResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
