import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createAddress, createAddressFromDetails, getAddressById, getBrazilHierarchy, getCitiesBySubdivision, getHierarchyChildren, getStreetTypes, restoreAddress, searchAddresses, searchNeighborhoods, searchStreets, softDeleteAddress, updateAddress } from "./db";
import { addresses } from "../drizzle/schema";
import { archiveCatalog, createCatalog, listCatalog, restoreCatalog, updateCatalog, type CatalogEntity } from "./catalogAdmin";

const coordinate = z.number().min(-180).max(180).nullable().optional();

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  locations: router({
    brazilHierarchy: publicProcedure.query(() => getBrazilHierarchy()),
    citiesBySubdivision: publicProcedure.input(z.object({ subdivisionId: z.number().int().positive() })).query(({ input }) => getCitiesBySubdivision(input.subdivisionId)),
    streetTypes: publicProcedure.query(() => getStreetTypes()),
    neighborhoodsSearch: publicProcedure.input(z.object({ cityId: z.number().int().positive(), query: z.string().trim().max(160).optional(), limit: z.number().int().min(1).max(20).default(10) })).query(({ input }) => searchNeighborhoods(input)),
    streetsSearch: publicProcedure.input(z.object({ cityId: z.number().int().positive(), query: z.string().trim().max(180).optional(), limit: z.number().int().min(1).max(20).default(10) })).query(({ input }) => searchStreets(input)),
    search: publicProcedure.input(z.object({
      query: z.string().trim().max(180).optional(),
      postalCode: z.string().trim().max(12).optional(),
      cityId: z.number().int().positive().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      radiusKm: z.number().positive().max(500).optional(),
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0),
    })).query(({ input }) => searchAddresses(input)),
    hierarchyChildren: publicProcedure.input(z.object({ type: z.enum(["cities", "neighborhoods", "streets"]), parentId: z.number().int().positive() })).query(({ input }) => getHierarchyChildren(input.type, input.parentId)),
    catalogList: adminProcedure.input(z.object({ entity: z.enum(["subdivisions", "cities", "neighborhoods", "street_types", "streets"]), parentId: z.number().int().positive().optional() })).query(({ input }) => listCatalog(input.entity, input.parentId)),
    catalogCreate: adminProcedure.input(z.discriminatedUnion("entity", [
      z.object({ entity: z.literal("subdivisions"), data: z.object({ countryId: z.number().int().positive(), code: z.string().min(1).max(12), name: z.string().min(1).max(120), shortName: z.string().max(12).optional(), subdivisionType: z.string().max(40).default("state") }) }),
      z.object({ entity: z.literal("cities"), data: z.object({ countryId: z.number().int().positive(), subdivisionId: z.number().int().positive(), officialCode: z.string().max(24).optional(), name: z.string().min(1).max(160), normalizedName: z.string().min(1).max(160) }) }),
      z.object({ entity: z.literal("neighborhoods"), data: z.object({ cityId: z.number().int().positive(), name: z.string().min(1).max(160), normalizedName: z.string().min(1).max(160) }) }),
      z.object({ entity: z.literal("street_types"), data: z.object({ code: z.string().min(1).max(24), name: z.string().min(1).max(64), abbreviation: z.string().max(16).optional() }) }),
      z.object({ entity: z.literal("streets"), data: z.object({ cityId: z.number().int().positive(), neighborhoodId: z.number().int().positive().optional(), streetTypeId: z.number().int().positive(), name: z.string().min(1).max(180), normalizedName: z.string().min(1).max(180), postalCode: z.string().max(12).optional() }) }),
    ])).mutation(({ input, ctx }) => createCatalog(input.entity as CatalogEntity, input.data, ctx.user.id)),
    catalogUpdate: adminProcedure.input(z.object({ entity: z.enum(["subdivisions", "cities", "neighborhoods", "street_types", "streets"]), id: z.number().int().positive(), data: z.record(z.string(), z.unknown()) })).mutation(({ input, ctx }) => updateCatalog(input.entity as CatalogEntity, input.id, input.data, ctx.user.id)),
    catalogArchive: adminProcedure.input(z.object({ entity: z.enum(["subdivisions", "cities", "neighborhoods", "street_types", "streets"]), id: z.number().int().positive(), reason: z.string().trim().max(240).optional() })).mutation(({ input, ctx }) => archiveCatalog(input.entity as CatalogEntity, input.id, ctx.user.id, input.reason)),
    catalogRestore: adminProcedure.input(z.object({ entity: z.enum(["subdivisions", "cities", "neighborhoods", "street_types", "streets"]), id: z.number().int().positive(), reason: z.string().trim().max(240).optional() })).mutation(({ input, ctx }) => restoreCatalog(input.entity as CatalogEntity, input.id, ctx.user.id, input.reason)),
    getById: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getAddressById(input.id)),
    createAddress: adminProcedure.input(z.object({
      streetId: z.number().int().positive(),
      postalCode: z.string().trim().max(12).optional(),
      number: z.string().trim().min(1).max(24),
      complement: z.string().trim().max(160).optional(),
      referencePoint: z.string().trim().max(240).optional(),
      latitude: coordinate,
      longitude: coordinate,
      locationSource: z.enum(["gps", "manual", "geocoded", "imported"]).optional(),
      areaType: z.enum(["urban", "rural"]).default("urban"),
    })).mutation(({ input, ctx }) => createAddress({ ...input, createdBy: ctx.user.id } as typeof addresses.$inferInsert)),
    createAddressFromDetails: adminProcedure.input(z.object({
      cityId: z.number().int().positive(),
      streetTypeId: z.number().int().positive(),
      streetName: z.string().trim().min(1).max(180),
      neighborhoodName: z.string().trim().max(160).optional(),
      postalCode: z.string().trim().max(12).optional(),
      number: z.string().trim().min(1).max(24),
      complement: z.string().trim().max(160).optional(),
      referencePoint: z.string().trim().max(240).optional(),
      latitude: coordinate,
      longitude: coordinate,
      locationSource: z.enum(["gps", "manual", "geocoded", "imported"]).optional(),
      areaType: z.enum(["urban", "rural"]).default("urban"),
    })).mutation(({ input, ctx }) => createAddressFromDetails({ ...input, latitude: input.latitude == null ? undefined : String(input.latitude), longitude: input.longitude == null ? undefined : String(input.longitude), createdBy: ctx.user.id })),
    updateAddress: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      postalCode: z.string().trim().max(12).optional(),
      number: z.string().trim().min(1).max(24).optional(),
      complement: z.string().trim().max(160).nullable().optional(),
      referencePoint: z.string().trim().max(240).nullable().optional(),
      latitude: coordinate,
      longitude: coordinate,
      locationSource: z.enum(["gps", "manual", "geocoded", "imported"]).nullable().optional(),
      areaType: z.enum(["urban", "rural"]).optional(),
    })).mutation(({ input, ctx }) => {
      const { id, latitude, longitude, ...changes } = input;
      return updateAddress(id, {
        ...changes,
        latitude: latitude == null ? latitude : String(latitude),
        longitude: longitude == null ? longitude : String(longitude),
      }, ctx.user.id);
    }),
    archiveAddress: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().max(240).optional() })).mutation(({ input, ctx }) => softDeleteAddress(input.id, ctx.user.id, input.reason)),
    restoreAddress: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().max(240).optional() })).mutation(({ input, ctx }) => restoreAddress(input.id, ctx.user.id, input.reason)),
  }),
});

export type AppRouter = typeof appRouter;
