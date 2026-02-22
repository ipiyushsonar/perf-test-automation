import { eq, desc, sql } from "drizzle-orm";
import type { AppDatabase } from "../index";
import { reports, grafanaSnapshots } from "../schema/reports";

export function reportQueries(db: AppDatabase) {
  return {
    findAll: (limit = 50, offset = 0) =>
      db
        .select()
        .from(reports)
        .orderBy(desc(reports.createdAt))
        .limit(limit)
        .offset(offset),

    findById: (id: number) =>
      db.select().from(reports).where(eq(reports.id, id)).get(),

    create: (values: typeof reports.$inferInsert) =>
      db.insert(reports).values(values).returning().get(),

    update: (id: number, values: Partial<typeof reports.$inferInsert>) =>
      db
        .update(reports)
        .set(values)
        .where(eq(reports.id, id))
        .returning()
        .get(),

    delete: (id: number) =>
      db.delete(reports).where(eq(reports.id, id)).run(),

    // Grafana Snapshots
    findSnapshots: (reportId: number) =>
      db
        .select()
        .from(grafanaSnapshots)
        .where(eq(grafanaSnapshots.reportId, reportId)),

    insertSnapshot: (values: typeof grafanaSnapshots.$inferInsert) =>
      db.insert(grafanaSnapshots).values(values).returning().get(),
  };
}
