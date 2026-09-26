import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  addresses,
  auditLogs,
  neighborhoods,
  cities,
  countries,
  subdivisions,
  streets,
  streetTypes,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getStreetTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(streetTypes).where(eq(streetTypes.status, "active")).orderBy(asc(streetTypes.name));
}

export async function getCitiesBySubdivision(subdivisionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cities).where(and(eq(cities.subdivisionId, subdivisionId), isNull(cities.deletedAt))).orderBy(asc(cities.name));
}

export async function searchStreets(input: { cityId: number; query?: string; limit: number }) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(streets.cityId, input.cityId), isNull(streets.deletedAt)];
  if (input.query?.trim()) {
    const term = `${input.query.trim()}%`;
    filters.push(or(like(streets.name, term), like(streets.normalizedName, term))!);
  }
  return db.select({ id: streets.id, name: streets.name, postalCode: streets.postalCode, streetTypeId: streets.streetTypeId, neighborhoodId: streets.neighborhoodId })
    .from(streets).where(and(...filters)).orderBy(asc(streets.name)).limit(input.limit);
}

export async function searchNeighborhoods(input: { cityId: number; query?: string; limit: number }) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(neighborhoods.cityId, input.cityId), isNull(neighborhoods.deletedAt)];
  if (input.query?.trim()) {
    const term = `${input.query.trim()}%`;
    filters.push(or(like(neighborhoods.name, term), like(neighborhoods.normalizedName, term))!);
  }
  return db.select({ id: neighborhoods.id, name: neighborhoods.name })
    .from(neighborhoods).where(and(...filters)).orderBy(asc(neighborhoods.name)).limit(input.limit);
}

export function normalizeAddressName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

export async function getBrazilHierarchy() {
  const db = await getDb();
  if (!db) return { country: null, subdivisions: [], cities: [] };
  const country = (await db.select().from(countries).where(eq(countries.isoAlpha2, "BR")).limit(1))[0] ?? null;
  if (!country) return { country: null, subdivisions: [], cities: [] };
  const stateRows = await db.select().from(subdivisions).where(and(eq(subdivisions.countryId, country.id), isNull(subdivisions.deletedAt))).orderBy(asc(subdivisions.name));
  const cityRows = await db.select().from(cities).where(and(eq(cities.countryId, country.id), isNull(cities.deletedAt))).orderBy(asc(cities.name));
  return { country, subdivisions: stateRows, cities: cityRows };
}

export async function searchAddresses(input: { query?: string; postalCode?: string; cityId?: number; latitude?: number; longitude?: number; radiusKm?: number; limit: number; offset: number }) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(addresses.status, "active"), isNull(addresses.deletedAt)];
  if (input.postalCode) filters.push(eq(addresses.postalCode, input.postalCode));
  if (input.cityId) filters.push(eq(streets.cityId, input.cityId));
  if (input.query) {
    const term = `%${input.query.trim()}%`;
    filters.push(or(like(streets.name, term), like(streets.normalizedName, term), like(addresses.number, term))!);
  }
  const distance = input.latitude !== undefined && input.longitude !== undefined
    ? sql<number>`6371 * ACOS(LEAST(1, COS(RADIANS(${input.latitude})) * COS(RADIANS(${addresses.latitude})) * COS(RADIANS(${addresses.longitude}) - RADIANS(${input.longitude})) + SIN(RADIANS(${input.latitude})) * SIN(RADIANS(${addresses.latitude}))))`
    : sql<number>`NULL`;
  if (input.radiusKm && input.latitude !== undefined && input.longitude !== undefined) filters.push(sql`${distance} <= ${input.radiusKm}`);
  return db.select({
    id: addresses.id,
    number: addresses.number,
    postalCode: addresses.postalCode,
    complement: addresses.complement,
    referencePoint: addresses.referencePoint,
    latitude: addresses.latitude,
    longitude: addresses.longitude,
    distanceKm: distance,
    streetName: streets.name,
    streetTypeId: streets.streetTypeId,
    cityId: streets.cityId,
  }).from(addresses).innerJoin(streets, eq(addresses.streetId, streets.id)).where(and(...filters)).orderBy(desc(addresses.updatedAt)).limit(input.limit).offset(input.offset);
}

export async function getHierarchyChildren(type: "cities" | "neighborhoods" | "streets", parentId: number) {
  const db = await getDb();
  if (!db) return [];
  if (type === "cities") return db.select().from(cities).where(and(eq(cities.subdivisionId, parentId), isNull(cities.deletedAt))).orderBy(asc(cities.name));
  if (type === "neighborhoods") return db.select().from(neighborhoods).where(and(eq(neighborhoods.cityId, parentId), isNull(neighborhoods.deletedAt))).orderBy(asc(neighborhoods.name));
  return db.select().from(streets).where(and(eq(streets.cityId, parentId), isNull(streets.deletedAt))).orderBy(asc(streets.name));
}

export async function recordAudit(input: {
  entityType: string;
  entityId: number;
  action: "create" | "update" | "delete" | "restore";
  actorUserId?: number;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorUserId: input.actorUserId,
    beforeData: input.beforeData ? JSON.stringify(input.beforeData) : null,
    afterData: input.afterData ? JSON.stringify(input.afterData) : null,
    reason: input.reason,
  });
}

export async function getAddressById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  return result[0];
}

export async function createAddressFromDetails(input: { cityId: number; streetTypeId: number; streetName: string; neighborhoodName?: string; postalCode?: string; number: string; complement?: string; referencePoint?: string; latitude?: string; longitude?: string; locationSource?: "gps" | "manual" | "geocoded" | "imported"; areaType?: "urban" | "rural"; createdBy?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalize = normalizeAddressName;
  let neighborhoodId: number | undefined;
  if (input.neighborhoodName?.trim()) {
    const normalizedName = normalize(input.neighborhoodName);
    const existingNeighborhood = (await db.select().from(neighborhoods).where(and(eq(neighborhoods.cityId, input.cityId), eq(neighborhoods.normalizedName, normalizedName), isNull(neighborhoods.deletedAt))).limit(1))[0];
    if (existingNeighborhood) neighborhoodId = existingNeighborhood.id;
    else {
      const neighborhoodResult = await db.insert(neighborhoods).values({ cityId: input.cityId, name: input.neighborhoodName.trim(), normalizedName });
      neighborhoodId = Number(neighborhoodResult[0].insertId);
      await recordAudit({ entityType: "neighborhoods", entityId: neighborhoodId, action: "create", actorUserId: input.createdBy, afterData: { cityId: input.cityId, name: input.neighborhoodName.trim() } });
    }
  }
  const normalizedStreetName = normalize(input.streetName);
  const existingStreet = (await db.select().from(streets).where(and(eq(streets.cityId, input.cityId), eq(streets.streetTypeId, input.streetTypeId), eq(streets.normalizedName, normalizedStreetName), neighborhoodId ? eq(streets.neighborhoodId, neighborhoodId) : isNull(streets.neighborhoodId), isNull(streets.deletedAt))).limit(1))[0];
  let streetId = existingStreet?.id;
  if (!streetId) {
    const streetResult = await db.insert(streets).values({ cityId: input.cityId, neighborhoodId, streetTypeId: input.streetTypeId, name: input.streetName.trim(), normalizedName: normalizedStreetName, postalCode: input.postalCode });
    streetId = Number(streetResult[0].insertId);
    await recordAudit({ entityType: "streets", entityId: streetId, action: "create", actorUserId: input.createdBy, afterData: { cityId: input.cityId, name: input.streetName.trim() } });
  }
  return createAddress({ streetId, postalCode: input.postalCode, number: input.number.trim(), complement: input.complement?.trim(), referencePoint: input.referencePoint?.trim(), latitude: input.latitude, longitude: input.longitude, locationSource: input.locationSource ?? "manual", areaType: input.areaType ?? "urban", createdBy: input.createdBy });
}

export async function createAddress(input: typeof addresses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(addresses).values(input);
  const id = Number(result[0].insertId);
  const address = await getAddressById(id);
  await recordAudit({ entityType: "address", entityId: id, action: "create", actorUserId: input.createdBy ?? undefined, afterData: address });
  return address;
}

export async function updateAddress(id: number, input: Partial<typeof addresses.$inferInsert>, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const before = await getAddressById(id);
  if (!before) return undefined;
  await db.update(addresses).set({ ...input, updatedBy: actorUserId }).where(eq(addresses.id, id));
  const after = await getAddressById(id);
  await recordAudit({ entityType: "address", entityId: id, action: "update", actorUserId, beforeData: before, afterData: after });
  return after;
}

export async function softDeleteAddress(id: number, actorUserId?: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const before = await getAddressById(id);
  await db.update(addresses).set({ status: "archived", deletedAt: new Date(), updatedBy: actorUserId }).where(eq(addresses.id, id));
  const after = await getAddressById(id);
  await recordAudit({ entityType: "address", entityId: id, action: "delete", actorUserId, beforeData: before, afterData: after, reason });
  return after;
}

export async function restoreAddress(id: number, actorUserId?: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const before = await getAddressById(id);
  await db.update(addresses).set({ status: "active", deletedAt: null, updatedBy: actorUserId }).where(eq(addresses.id, id));
  const after = await getAddressById(id);
  await recordAudit({ entityType: "address", entityId: id, action: "restore", actorUserId, beforeData: before, afterData: after, reason });
  return after;
}
