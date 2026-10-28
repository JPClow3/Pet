import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function inside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
function exists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Next 16 can omit instrumentation-only dependencies from standalone output.
 * OpenNext then drops those trace entries, leaving its static chunk registry incomplete.
 * https://github.com/opennextjs/opennextjs-aws/issues/1237
 * Restore only missing traced dependencies; do not change the monitoring hook or bundles.
 */
export function prepareCloudflareInstrumentation(
  projectDirectory = process.cwd(),
) {
  const project = fs.realpathSync(path.resolve(projectDirectory));
  const build = path.join(project, ".next");
  const server = path.join(build, "server");
  const tracePath = path.join(server, "instrumentation.js.nft.json");
  if (!exists(tracePath)) {
    if (exists(path.join(server, "instrumentation.js")))
      throw new Error(
        "Instrumentation entry exists without its trace manifest.",
      );
    return { traced: 0, copied: 0 };
  }
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  if (
    !Array.isArray(trace.files) ||
    trace.files.some((file) => typeof file !== "string" || file.length === 0)
  )
    throw new Error("Invalid instrumentation trace manifest.");
  const standalone = path.join(build, "standalone");
  if (!exists(standalone) || !fs.statSync(standalone).isDirectory())
    throw new Error(
      "Build Next.js in standalone mode before packaging instrumentation.",
    );
  const actualStandalone = fs.realpathSync(standalone);
  if (!inside(project, actualStandalone))
    throw new Error("Standalone output must stay inside the project.");
  const verifySource = (source, ancestors = new Set()) => {
    const actual = fs.realpathSync(source);
    if (!inside(project, actual))
      throw new Error(
        "Instrumentation dependency resolves outside the project.",
      );
    const stats = fs.statSync(source);
    if (stats.isFile()) return false;
    if (!stats.isDirectory())
      throw new Error("Unsupported instrumentation dependency.");
    if (ancestors.has(actual))
      throw new Error("Circular instrumentation dependency directory.");
    const parents = new Set([...ancestors, actual]);
    for (const child of fs.readdirSync(source))
      verifySource(path.join(source, child), parents);
    return true;
  };
  // Turbopack traces generated external-package aliases as directory junctions.
  // OpenNext reads THIS original NFT file, but its copier supports only files or
  // symlinks: a dereferenced directory alone is dropped with EISDIR. Enumerate
  // its concrete files so package resolution survives OpenNext's file-only copy.
  // Append entries to retain every original metadata/hash index unchanged.
  const expandedFiles = new Set(trace.files);
  const addDirectoryFiles = (source) => {
    for (const child of fs.readdirSync(source)) {
      const childPath = path.join(source, child);
      if (fs.statSync(childPath).isDirectory()) addDirectoryFiles(childPath);
      else
        expandedFiles.add(
          path.relative(server, childPath).split(path.sep).join("/"),
        );
    }
  };
  for (const file of trace.files) {
    const source = path.resolve(server, file);
    if (!inside(project, source))
      throw new Error(`Instrumentation trace escapes the project: ${file}`);
    if (!exists(source))
      throw new Error(`Missing instrumentation dependency: ${file}`);
    if (verifySource(source)) addDirectoryFiles(source);
  }
  // Validate the complete plan first, so a malformed trace cannot partially copy files.
  const plan = [
    ...new Set([
      "instrumentation.js",
      "instrumentation.js.nft.json",
      ...expandedFiles,
    ]),
  ].map((file) => {
    const source = path.resolve(server, file);
    if (!inside(project, source))
      throw new Error(`Instrumentation trace escapes the project: ${file}`);
    const target = path.resolve(standalone, path.relative(project, source));
    if (!inside(standalone, target))
      throw new Error(`Instrumentation target escapes standalone: ${file}`);
    if (!exists(source))
      throw new Error(`Missing instrumentation dependency: ${file}`);
    const directory = verifySource(source);
    if (exists(target) && !inside(actualStandalone, fs.realpathSync(target)))
      throw new Error(
        `Instrumentation target resolves outside standalone: ${file}`,
      );
    let ancestor = path.dirname(target);
    while (!exists(ancestor)) ancestor = path.dirname(ancestor);
    const actualAncestor = fs.realpathSync(ancestor);
    if (
      actualAncestor !== actualStandalone &&
      !inside(actualStandalone, actualAncestor)
    )
      throw new Error(
        `Instrumentation target resolves outside standalone: ${file}`,
      );
    return { source, target, directory };
  });
  if (expandedFiles.size !== trace.files.length) {
    fs.writeFileSync(
      tracePath,
      JSON.stringify({ ...trace, files: [...expandedFiles] }),
    );
  }
  let copied = 0;
  for (const { source, target, directory } of plan) {
    if (exists(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // Dereference traced package aliases so the standalone copy is self-contained.
    fs.cpSync(source, target, {
      recursive: directory,
      dereference: true,
      force: false,
      errorOnExist: true,
    });
    copied++;
  }
  return { traced: plan.length, copied };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const result = prepareCloudflareInstrumentation();
  console.log(
    `Prepared instrumentation: ${result.copied} missing entries copied (${result.traced} traced entries).`,
  );
}
