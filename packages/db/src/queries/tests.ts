import { eq, desc, and, sql, inArray } from "drizzle-orm";
import type { AppDatabase } from "../index";
import { testRuns, testStatistics, testTypes } from "../schema/test-runs";

export function testQueries(db: AppDatabase) {
  return {
    // Test Types
    findAllTestTypes: () => db.select().from(testTypes),

    findTestTypeByName: (name: string) =>
      db.select().from(testTypes).where(eq(testTypes.name, name)).get(),

    // Test Runs
    findAll: (limit = 50, offset = 0) =>
      db
        .select()
        .from(testRuns)
        .orderBy(desc(testRuns.createdAt))
        .limit(limit)
        .offset(offset),

    findById: (id: number) =>
      db.select().from(testRuns).where(eq(testRuns.id, id)).get(),

    findByStatus: (status: string) =>
      db
        .select()
        .from(testRuns)
        .where(eq(testRuns.status, status))
        .orderBy(desc(testRuns.createdAt)),

    findByScenario: (scenarioId: number) =>
      db
        .select()
        .from(testRuns)
        .where(eq(testRuns.scenarioId, scenarioId))
        .orderBy(desc(testRuns.createdAt)),

    create: (values: typeof testRuns.$inferInsert) =>
      db.insert(testRuns).values(values).returning().get(),

    update: (id: number, values: Partial<typeof testRuns.$inferInsert>) =>
      db
        .update(testRuns)
        .set(values)
        .where(eq(testRuns.id, id))
        .returning()
        .get(),

    delete: (id: number) =>
      db.delete(testRuns).where(eq(testRuns.id, id)).run(),

    countByStatus: () =>
      db
        .select({
          status: testRuns.status,
          count: sql<number>`count(*)`,
        })
        .from(testRuns)
        .groupBy(testRuns.status),

    // Test Statistics
    findStatistics: (testRunId: number) =>
      db
        .select()
        .from(testStatistics)
        .where(eq(testStatistics.testRunId, testRunId))
        .orderBy(testStatistics.transactionName),

    insertStatistics: (values: (typeof testStatistics.$inferInsert)[]) =>
      db.insert(testStatistics).values(values).returning(),

    deleteStatistics: (testRunId: number) =>
      db
        .delete(testStatistics)
        .where(eq(testStatistics.testRunId, testRunId))
        .run(),
  };
}
