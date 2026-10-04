import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const recordStatuses = ["active", "inactive", "archived"] as const;
export type RecordStatus = (typeof recordStatuses)[number];

export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  isoAlpha2: varchar("isoAlpha2", { length: 2 }).notNull(),
  isoAlpha3: varchar("isoAlpha3", { length: 3 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  nativeName: varchar("nativeName", { length: 160 }),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  alpha2Unique: uniqueIndex("countries_iso_alpha2_uq").on(table.isoAlpha2),
  alpha3Unique: uniqueIndex("countries_iso_alpha3_uq").on(table.isoAlpha3),
  statusIdx: index("countries_status_idx").on(table.status),
}));

export const subdivisions = mysqlTable("subdivisions", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull().references(() => countries.id),
  code: varchar("code", { length: 12 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  shortName: varchar("shortName", { length: 12 }),
  subdivisionType: varchar("subdivisionType", { length: 40 }).notNull().default("state"),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  countryCodeUnique: uniqueIndex("subdivisions_country_code_uq").on(table.countryId, table.code),
  countryNameIdx: index("subdivisions_country_name_idx").on(table.countryId, table.name),
}));

export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull().references(() => countries.id),
  subdivisionId: int("subdivisionId").notNull().references(() => subdivisions.id),
  officialCode: varchar("officialCode", { length: 24 }),
  name: varchar("name", { length: 160 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 160 }).notNull(),
  latitude: decimal("latitude", { precision: 9, scale: 6 }),
  longitude: decimal("longitude", { precision: 9, scale: 6 }),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  officialCodeUnique: uniqueIndex("cities_official_code_uq").on(table.countryId, table.officialCode),
  subdivisionNameUnique: uniqueIndex("cities_subdivision_name_uq").on(table.subdivisionId, table.normalizedName),
  searchIdx: index("cities_search_idx").on(table.subdivisionId, table.normalizedName),
}));

export const neighborhoods = mysqlTable("neighborhoods", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull().references(() => cities.id),
  name: varchar("name", { length: 160 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 160 }).notNull(),
  areaType: mysqlEnum("areaType", ["urban", "rural"]).default("urban").notNull(),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  cityNameUnique: uniqueIndex("neighborhoods_city_name_uq").on(table.cityId, table.normalizedName),
  searchIdx: index("neighborhoods_search_idx").on(table.cityId, table.normalizedName),
}));

export const streetTypes = mysqlTable("street_types", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 24 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 16 }),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
});

export const streets = mysqlTable("streets", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull().references(() => cities.id),
  neighborhoodId: int("neighborhoodId").references(() => neighborhoods.id),
  streetTypeId: int("streetTypeId").notNull().references(() => streetTypes.id),
  name: varchar("name", { length: 180 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 180 }).notNull(),
  postalCode: varchar("postalCode", { length: 12 }),
  latitude: decimal("latitude", { precision: 9, scale: 6 }),
  longitude: decimal("longitude", { precision: 9, scale: 6 }),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  dedupUnique: uniqueIndex("streets_city_type_name_neighborhood_uq").on(table.cityId, table.streetTypeId, table.normalizedName, table.neighborhoodId),
  citySearchIdx: index("streets_city_search_idx").on(table.cityId, table.normalizedName),
  postalCodeIdx: index("streets_postal_code_idx").on(table.postalCode),
}));

export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  streetId: int("streetId").notNull().references(() => streets.id),
  postalCode: varchar("postalCode", { length: 12 }),
  number: varchar("number", { length: 24 }).notNull(),
  propertyType: mysqlEnum("propertyType", ["house", "store", "apartment", "other"]).default("house").notNull(),
  apartmentNumber: varchar("apartmentNumber", { length: 24 }),
  buildingBlock: varchar("buildingBlock", { length: 24 }),
  tower: varchar("tower", { length: 24 }),
  floorNumber: varchar("floorNumber", { length: 24 }),
  commercialUnit: varchar("commercialUnit", { length: 48 }),
  complement: varchar("complement", { length: 160 }),
  referencePoint: varchar("referencePoint", { length: 240 }),
  latitude: decimal("latitude", { precision: 9, scale: 6 }),
  longitude: decimal("longitude", { precision: 9, scale: 6 }),
  locationSource: mysqlEnum("locationSource", ["gps", "manual", "geocoded", "imported"]),
  areaType: mysqlEnum("areaType", ["urban", "rural"]).default("urban").notNull(),
  status: mysqlEnum("status", recordStatuses).default("active").notNull(),
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  streetNumberIdx: index("addresses_street_number_idx").on(table.streetId, table.number),
  postalCodeIdx: index("addresses_postal_code_idx").on(table.postalCode),
  coordinatesIdx: index("addresses_coordinates_idx").on(table.latitude, table.longitude),
  activeIdx: index("addresses_status_deleted_idx").on(table.status, table.deletedAt),
}));

export const auditLogs = mysqlTable("address_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 48 }).notNull(),
  entityId: int("entityId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "restore"]).notNull(),
  actorUserId: int("actorUserId").references(() => users.id),
  beforeData: text("beforeData"),
  afterData: text("afterData"),
  reason: varchar("reason", { length: 240 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("address_audit_entity_idx").on(table.entityType, table.entityId, table.createdAt),
  actorIdx: index("address_audit_actor_idx").on(table.actorUserId, table.createdAt),
}));

export type Country = typeof countries.$inferSelect;
export type Subdivision = typeof subdivisions.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Neighborhood = typeof neighborhoods.$inferSelect;
export type StreetType = typeof streetTypes.$inferSelect;
export type Street = typeof streets.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

export const brazilSeed = {
  isoAlpha2: "BR",
  isoAlpha3: "BRA",
  name: "Brasil",
  nativeName: "Brasil",
} as const;

export const defaultStreetTypes = [
  { code: "RUA", name: "Rua", abbreviation: "R." },
  { code: "AVENIDA", name: "Avenida", abbreviation: "Av." },
  { code: "VIELA", name: "Viela", abbreviation: "Vla." },
  { code: "ALAMEDA", name: "Alameda", abbreviation: "Al." },
  { code: "TRAVESSA", name: "Travessa", abbreviation: "Tv." },
  { code: "RODOVIA", name: "Rodovia", abbreviation: "Rod." },
] as const;
