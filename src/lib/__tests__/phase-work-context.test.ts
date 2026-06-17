import { describe, expect, it } from "vitest";
import {
  formatWorkContextForAnalysis,
  parseWorkContexts,
  resolveWorkClient,
} from "@/lib/work-context";

describe("work-context", () => {
  it("parses split verizon and freelance fields", () => {
    const bundle = parseWorkContexts({
      work_context: "legacy blob",
      work_context_verizon: "Verizon GEMS",
      work_context_freelance: "Afroz slider",
    });
    expect(bundle.verizon).toBe("Verizon GEMS");
    expect(bundle.freelance).toBe("Afroz slider");
  });

  it("falls back legacy work_context to verizon", () => {
    const bundle = parseWorkContexts({
      work_context: "only legacy",
      work_context_verizon: null,
      work_context_freelance: null,
    });
    expect(bundle.verizon).toBe("only legacy");
  });

  it("defaults work tasks without client to verizon", () => {
    expect(
      resolveWorkClient({ category: "work", work_client: null }),
    ).toBe("verizon");
    expect(
      resolveWorkClient({ category: "work", work_client: "freelance" }),
    ).toBe("freelance");
    expect(resolveWorkClient({ category: "personal", work_client: null })).toBe(
      null,
    );
  });

  it("formats analysis block with both lanes", () => {
    const md = formatWorkContextForAnalysis({
      verizon: "VZ project",
      freelance: "Client X",
      legacy: null,
    }).join("\n");
    expect(md).toContain("Verizon · employer");
    expect(md).toContain("Freelance · side clients");
    expect(md).toContain("VZ project");
    expect(md).toContain("Client X");
  });
});
