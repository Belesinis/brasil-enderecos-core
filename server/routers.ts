import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createAddress, getAddressById, getBrazilHierarchy, getHierarchyChildren, restoreAddress, searchAddresses, softDeleteAddress, updateAddress } from "./db";
import { addresses } from "../drizzle/schema";

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
    })).mutation(({ input, ctx }) => createAddress({ ...input, createdBy: ctx.user.id } as typeof addresses.$inferInsert)),
    updateAddress: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      postalCode: z.string().trim().max(12).optional(),
      number: z.string().trim().min(1).max(24).optional(),
      complement: z.string().trim().max(160).nullable().optional(),
      referencePoint: z.string().trim().max(240).nullable().optional(),
      latitude: coordinate,
      longitude: coordinate,
      locationSource: z.enum(["gps", "manual", "geocoded", "imported"]).nullable().optional(),
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
