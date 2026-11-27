import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { LocalFileStorage } from "../LocalFileStorage";

describe("LocalFileStorage", () => {
  it("rejects write targets and deletes outside the application data directory", async () => {
    const storage = new LocalFileStorage();

    assert.throws(() => storage.getPath("../fora", "segredo.pdf"), /não autorizado/);
    await assert.rejects(
      storage.delete(path.resolve(path.parse(process.cwd()).root, "fora", "segredo.pdf")),
      /não autorizado/
    );
  });
});
