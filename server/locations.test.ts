import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: 10,
      openId: "test-user",
      name: "Teste",
      email: "teste@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("locations", () => {
  it("returns a stable empty search result when the database is unavailable", async () => {
    const caller = appRouter.createCaller(context());
    const result = await caller.locations.search({ query: "Rua Central", limit: 10, offset: 0 });
    expect(result).toEqual([]);
  });

  it("does not allow regular users to archive addresses", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.locations.archiveAddress({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts a valid hierarchical and proximity search input", async () => {
    const caller = appRouter.createCaller(context());
    const result = await caller.locations.search({ postalCode: "01311-000", cityId: 3550308, latitude: -23.5617, longitude: -46.656, radiusKm: 5, limit: 5, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("protects catalog mutations from regular users", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.locations.catalogCreate({ entity: "cities", data: { name: "Teste" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
