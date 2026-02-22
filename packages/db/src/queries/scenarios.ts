import { eq, desc, and, sql } from "drizzle-orm";
import type { AppDatabase } from "../index";
import { scenarios } from "../schema/scenarios";

export function scenarioQueries(db: AppDatabase) {
  return {
    findAll: () =>
      db.select().from(scenarios).orderBy(scenarios.name),

    findActive: () =>
      db
        .select()
        .from(scenarios)
        .where(eq(scenarios.isActive, true))
        .orderBy(scenarios.name),

    findById: (id: number) =>
      db.select().from(scenarios).where(eq(scenarios.id, id)).get(),

    findByName: (name: string) =>
      db.select().from(scenarios).where(eq(scenarios.name, name)).get(),

    create: (values: typeof scenarios.$inferInsert) =>
      db.insert(scenarios).values(values).returning().get(),

    update: (id: number, values: Partial<typeof scenarios.$inferInsert>) =>
      db
        .update(scenarios)
        .set(values)
        .where(eq(scenarios.id, id))
        .returning()
        .get(),

    delete: (id: number) =>
      db.delete(scenarios).where(eq(scenarios.id, id)).run(),
  };
}
