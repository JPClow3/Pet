import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { buildSync } from "esbuild";
import { prepareCloudflareInstrumentation } from "./prepare-cloudflare-instrumentation.mjs";

const fixtures = [];
function fixture(
  files = [
    "./chunks/instrumentation.js",
    "../../node_modules/monitor/index.js",
  ],
) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "pethub-instrumentation-"),
  );
  fixtures.push(root);
  fs.mkdirSync(path.join(root, ".next/server/chunks"), { recursive: true });
  fs.mkdirSync(path.join(root, ".next/standalone/.next/server/chunks"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "node_modules/monitor"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".next/server/instrumentation.js"),
    "require('./chunks/instrumentation.js')",
  );
  fs.writeFileSync(
    path.join(root, ".next/server/chunks/instrumentation.js"),
    "monitoring hook",
  );
  fs.writeFileSync(
    path.join(root, "node_modules/monitor/index.js"),
    "monitor dependency",
  );
  fs.writeFileSync(
    path.join(root, ".next/server/instrumentation.js.nft.json"),
    JSON.stringify({ version: 1, files }),
  );
  return root;
}
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("pethub-instrumentation-"));
    fs.rmSync(root, { recursive: true });
  }
});
test("restores entry, trace, exclusive chunk and package without rewriting existing output", () => {
  const root = fixture();
  const destination = path.join(
    root,
    ".next/standalone/.next/server/chunks/instrumentation.js",
  );
  fs.writeFileSync(destination, "preserved output");
  assert.deepEqual(prepareCloudflareInstrumentation(root), {
    traced: 4,
    copied: 3,
  });
  assert.equal(fs.readFileSync(destination, "utf8"), "preserved output");
  assert.equal(
    fs.readFileSync(
      path.join(root, ".next/standalone/node_modules/monitor/index.js"),
      "utf8",
    ),
    "monitor dependency",
  );
  assert.deepEqual(prepareCloudflareInstrumentation(root), {
    traced: 4,
    copied: 0,
  });
});
test("fails on missing dependencies before copying anything", () => {
  const root = fixture(["./chunks/missing.js"]);
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /Missing instrumentation dependency/,
  );
  assert.equal(
    fs.existsSync(
      path.join(root, ".next/standalone/.next/server/instrumentation.js"),
    ),
    false,
  );
});
test("rejects trace paths outside the project", () => {
  const root = fixture(["../../../outside.js"]);
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /escapes the project/,
  );
});
test("rejects malformed manifests and an entry with no trace", () => {
  const root = fixture();
  const manifest = path.join(root, ".next/server/instrumentation.js.nft.json");
  fs.writeFileSync(manifest, '{"files":[null]}');
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /Invalid instrumentation trace/,
  );
  fs.unlinkSync(manifest);
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /without its trace/,
  );
});
test("does nothing when the app has no instrumentation entry or trace", () => {
  const root = fixture();
  fs.unlinkSync(path.join(root, ".next/server/instrumentation.js.nft.json"));
  fs.unlinkSync(path.join(root, ".next/server/instrumentation.js"));
  assert.deepEqual(prepareCloudflareInstrumentation(root), {
    traced: 0,
    copied: 0,
  });
});
test("rejects source aliases resolving outside the project", () => {
  const root = fixture(["../../node_modules/external"]);
  const outside = fixture();
  fs.symlinkSync(
    path.join(outside, "node_modules/monitor"),
    path.join(root, "node_modules/external"),
    "junction",
  );
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /resolves outside the project/,
  );
});
test("rejects destination parent aliases resolving outside standalone", () => {
  const root = fixture();
  fs.symlinkSync(
    path.join(root, "node_modules"),
    path.join(root, ".next/standalone/node_modules"),
    "junction",
  );
  assert.throws(
    () => prepareCloudflareInstrumentation(root),
    /resolves outside standalone/,
  );
});
test("expands generated package aliases for OpenNext's file-only copier and esbuild", () => {
  const root = fixture(["../node_modules/monitor-opaque"]);
  const packageRoot = path.join(root, "node_modules/monitor");
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify({ name: "monitor", main: "index.js" }),
  );
  fs.writeFileSync(
    path.join(packageRoot, "index.js"),
    "module.exports = { monitoringAvailable: true };",
  );
  fs.mkdirSync(path.join(root, ".next/node_modules"));
  fs.symlinkSync(
    packageRoot,
    path.join(root, ".next/node_modules/monitor-opaque"),
    "junction",
  );
  const manifestPath = path.join(
    root,
    ".next/server/instrumentation.js.nft.json",
  );
  const original = {
    ...JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    entryHash: "entry-metadata",
    fileHashes: ["alias-metadata"],
    custom: { retained: true },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(original));
  prepareCloudflareInstrumentation(root);
  const expanded = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(expanded.entryHash, original.entryHash);
  assert.deepEqual(expanded.fileHashes, original.fileHashes);
  assert.deepEqual(expanded.custom, original.custom);
  assert.ok(expanded.files.includes("../node_modules/monitor-opaque/index.js"));
  assert.ok(
    expanded.files.includes("../node_modules/monitor-opaque/package.json"),
  );
  // Mirror OpenNext: read the original NFT, source files from standalone, and
  // discard directory entries that its copyFile operation cannot copy.
  const packaged = path.join(root, "packaged/.next/server");
  for (const file of expanded.files) {
    const source = path.resolve(root, ".next/standalone/.next/server", file);
    if (fs.statSync(source).isDirectory()) continue;
    const target = path.resolve(packaged, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  const consumer = path.join(packaged, "chunks");
  fs.mkdirSync(consumer, { recursive: true });
  const bundled = buildSync({
    stdin: {
      contents: 'module.exports = require("monitor-opaque");',
      resolveDir: consumer,
    },
    bundle: true,
    platform: "node",
    write: false,
  });
  assert.match(bundled.outputFiles[0].text, /monitoringAvailable: true/);
  const snapshot = fs.readFileSync(manifestPath, "utf8");
  assert.equal(prepareCloudflareInstrumentation(root).copied, 0);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), snapshot);
});
