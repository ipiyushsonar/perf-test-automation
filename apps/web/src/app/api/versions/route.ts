import { getDb } from "@perf-test/db";
import { versions } from "@perf-test/db";
import { desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { createVersionSchema } from "@/lib/validation";
import { validateBody, successResponse, errorResponse } from "@/lib/api-utils";
import { requireAdmin, requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (session instanceof Response) return session;
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
    const session = requireAdmin(request);
    if (session instanceof Response) return session;
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
