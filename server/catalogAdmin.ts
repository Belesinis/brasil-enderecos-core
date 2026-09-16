import { and, asc, eq, isNull } from "drizzle-orm";
import { cities, neighborhoods, streets, streetTypes, subdivisions } from "../drizzle/schema";
import { getDb, recordAudit } from "./db";

export type CatalogEntity = "subdivisions" | "cities" | "neighborhoods" | "street_types" | "streets";

const tables = { subdivisions, cities, neighborhoods, street_types: streetTypes, streets } as const;

export async function listCatalog(entity: CatalogEntity, parentId?: number) {
  const db = await getDb();
  if (!db) return [];
  const table = tables[entity] as any;
  const parentColumn = entity === "cities" ? table.subdivisionId : entity === "neighborhoods" ? table.cityId : entity === "streets" ? table.cityId : undefined;
  const filters = [isNull(table.deletedAt)];
  if (parentColumn && parentId) filters.push(eq(parentColumn, parentId));
  return db.select().from(table).where(and(...filters)).orderBy(asc(table.name));
}

export async function createCatalog(entity: CatalogEntity, data: Record<string, unknown>, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const table = tables[entity] as any;
  const result = await db.insert(table).values(data);
  const id = Number(result[0].insertId);
  await recordAudit({ entityType: entity, entityId: id, action: "create", actorUserId, afterData: data });
  return { id, ...data };
}

export async function updateCatalog(entity: CatalogEntity, id: number, data: Record<string, unknown>, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const table = tables[entity] as any;
  const before = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, id));
  const after = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await recordAudit({ entityType: entity, entityId: id, action: "update", actorUserId, beforeData: before, afterData: after });
  return after;
}

export async function restoreCatalog(entity: CatalogEntity, id: number, actorUserId?: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const table = tables[entity] as any;
  const before = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await db.update(table).set({ status: "active", deletedAt: null, updatedAt: new Date() }).where(eq(table.id, id));
  const after = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await recordAudit({ entityType: entity, entityId: id, action: "restore", actorUserId, beforeData: before, afterData: after, reason });
  return after;
}

export async function archiveCatalog(entity: CatalogEntity, id: number, actorUserId?: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const table = tables[entity] as any;
  const before = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await db.update(table).set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() }).where(eq(table.id, id));
  const after = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  await recordAudit({ entityType: entity, entityId: id, action: "delete", actorUserId, beforeData: before, afterData: after, reason });
  return after;
}
