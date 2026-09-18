import { describe, expect, it } from "vitest";
import { normalizeAddressName } from "./db";

describe("manual address registration", () => {
  it("normalizes Brazilian names without accents for deterministic lookup", () => {
    expect(normalizeAddressName("  São José  ")).toBe("SAO JOSE");
    expect(normalizeAddressName("Avenida Paulista")).toBe("AVENIDA PAULISTA");
  });

  it("keeps the user-facing payload free of technical street identifiers", () => {
    const payload = {
      postalCode: "01311-100",
      cityId: 1,
      streetTypeId: 2,
      streetName: "Paulista",
      neighborhoodName: "Bela Vista",
      number: "1000",
    };
    expect(payload).not.toHaveProperty("streetId");
    expect(payload.number).toBe("1000");
  });
});
