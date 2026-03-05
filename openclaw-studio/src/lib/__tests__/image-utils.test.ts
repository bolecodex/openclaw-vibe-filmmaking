import { describe, it, expect } from "vitest";
import { validateImage } from "../image-utils";

function createMockFile(
  size: number,
  type: string,
  name = "test.png",
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateImage", () => {
  it("accepts small PNG", () => {
    const file = createMockFile(100_000, "image/png");
    expect(validateImage(file)).toEqual({ ok: true });
  });

  it("accepts JPEG under 2MB", () => {
    const file = createMockFile(1_900_000, "image/jpeg");
    expect(validateImage(file)).toEqual({ ok: true });
  });

  it("rejects file over 2MB", () => {
    const file = createMockFile(3_000_000, "image/png");
    const result = validateImage(file);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("过大");
  });

  it("rejects non-image MIME type", () => {
    const file = createMockFile(100, "application/pdf", "doc.pdf");
    const result = validateImage(file);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("不支持");
  });

  it("accepts WebP", () => {
    const file = createMockFile(500_000, "image/webp");
    expect(validateImage(file)).toEqual({ ok: true });
  });

  it("accepts GIF", () => {
    const file = createMockFile(200_000, "image/gif");
    expect(validateImage(file)).toEqual({ ok: true });
  });

  it("rejects SVG", () => {
    const file = createMockFile(1000, "image/svg+xml", "icon.svg");
    const result = validateImage(file);
    expect(result.ok).toBe(false);
  });
});
