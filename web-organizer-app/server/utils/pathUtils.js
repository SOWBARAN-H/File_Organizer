const fs = require("node:fs/promises");
const path = require("node:path");

async function validateDirectoryPath(inputPath) {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    const error = new Error("folderPath is required.");
    error.statusCode = 400;
    throw error;
  }

  const normalized = path.resolve(inputPath.trim());
  let stats;

  try {
    stats = await fs.stat(normalized);
  } catch {
    const error = new Error("Provided folder path does not exist.");
    error.statusCode = 404;
    throw error;
  }

  if (!stats.isDirectory()) {
    const error = new Error("Provided path is not a directory.");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function normalizeExtension(fileName) {
  return path.extname(fileName || "").toLowerCase();
}

function makeUniquePath(targetPath, usedSet) {
  if (!usedSet.has(targetPath)) {
    usedSet.add(targetPath);
    return targetPath;
  }

  const parsed = path.parse(targetPath);
  let counter = 1;

  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);
    if (!usedSet.has(candidate)) {
      usedSet.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}

module.exports = {
  makeUniquePath,
  normalizeExtension,
  validateDirectoryPath
};
