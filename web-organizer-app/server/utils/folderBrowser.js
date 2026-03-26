const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { BROWSER_SCOPE_HOME_ONLY } = require("../config");

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function windowsRoots() {
  const checks = [];

  for (let code = 67; code <= 90; code += 1) {
    const drive = `${String.fromCharCode(code)}:/`;
    checks.push(
      pathExists(drive).then((exists) => (exists ? drive : null))
    );
  }

  const roots = (await Promise.all(checks)).filter(Boolean);
  return roots.length > 0 ? roots : ["C:/"];
}

async function getBrowseRoots() {
  const home = path.resolve(os.homedir());

  if (BROWSER_SCOPE_HOME_ONLY) {
    return [home];
  }

  if (process.platform === "win32") {
    return windowsRoots();
  }

  return ["/", home];
}

function isInsideAnyRoot(candidatePath, allowedRoots) {
  const candidate = path.resolve(candidatePath);

  return allowedRoots.some((root) => {
    const normalizedRoot = path.resolve(root);
    const relative = path.relative(normalizedRoot, candidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

async function assertPathAllowed(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const roots = await getBrowseRoots();

  if (!isInsideAnyRoot(resolvedPath, roots)) {
    const error = new Error("Path is outside allowed browse roots.");
    error.statusCode = 403;
    throw error;
  }

  const stats = await fs.stat(resolvedPath).catch(() => null);

  if (!stats) {
    const error = new Error("Folder does not exist.");
    error.statusCode = 404;
    throw error;
  }

  if (!stats.isDirectory()) {
    const error = new Error("Path is not a directory.");
    error.statusCode = 400;
    throw error;
  }

  return { resolvedPath, roots };
}

async function listChildDirectories(parentPath) {
  const entries = await fs.readdir(parentPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: path.join(parentPath, entry.name)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  assertPathAllowed,
  getBrowseRoots,
  listChildDirectories
};
