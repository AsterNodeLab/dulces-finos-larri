import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeUrl } from "@/lib/security/url";
import { mediaAbs } from "@/lib/paths";

describe("seguridad", () => {
  it("bloquea URLs locales, privadas y esquemas no http", async () => {
    for (const u of ["file:///etc/passwd", "http://localhost:3000/api", "http://127.0.0.1/", "http://10.0.0.5/x", "http://192.168.1.1", "http://[::1]/", "http://user:pass@example.com", "javascript:alert(1)", "http://169.254.169.254/latest/meta-data", "http://[::ffff:127.0.0.1]/", "http://[::ffff:a9fe:a9fe]/", "http://[::ffff:7f00:1]/", "http://[64:ff9b::7f00:1]/", "http://[::127.0.0.1]/", "http://0x7f000001/", "http://2130706433/"]) {
      await expect(assertSafeUrl(u), u).rejects.toThrow();
    }
  });
  it("acepta URLs públicas http(s)", async () => {
    await expect(assertSafeUrl("https://93.184.215.14/")).resolves.toBeInstanceOf(URL);
  });
  it("impide path traversal en media", () => {
    expect(() => mediaAbs("../studio.db")).toThrow();
    expect(() => mediaAbs("projects/../../studio.db")).toThrow();
    expect(mediaAbs("projects/p1/a.wav")).toContain(["projects", "p1", "a.wav"].join(path.sep));
  });
});
