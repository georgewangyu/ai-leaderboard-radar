import { expect, test } from "vitest";
import { sourceTypeLabel } from "@/lib/companies";

test("sourceTypeLabel title-cases each dash-separated word", () => {
  expect(sourceTypeLabel("founder-verification")).toBe("Founder Verification");
  expect(sourceTypeLabel("public")).toBe("Public");
});
