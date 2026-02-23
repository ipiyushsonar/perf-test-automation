import { NextRequest, NextResponse } from "next/server";
import { getDb, versions } from "@perf-test/db";
import { eq } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const [version] = await db
            .select()
            .from(versions)
            .where(eq(versions.id, Number(id)))
            .limit(1);

        if (!version) {
            return NextResponse.json(
                { success: false, error: "Version not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: version });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();
        const body = await request.json();

        const [result] = await db
            .update(versions)
            .set({
                version: body.version,
                displayName: body.displayName,
                releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
                description: body.description,
            })
            .where(eq(versions.id, Number(id)))
            .returning();

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Version not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();

        const [deleted] = await db
            .delete(versions)
            .where(eq(versions.id, Number(id)))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Version not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Version deleted" });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
