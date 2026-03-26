const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  DEFAULT_CATEGORIES,
  MAX_PREVIEW_ITEMS,
  METADATA_FILENAME
} = require("../config");
const {
  makeUniquePath,
  normalizeExtension
} = require("../utils/pathUtils");

function extensionToCategoryMap() {
  const map = new Map();

  Object.entries(DEFAULT_CATEGORIES).forEach(([category, extList]) => {
    extList.forEach((ext) => map.set(ext, category));
  });

  return map;
}

const EXTENSION_MAP = extensionToCategoryMap();

function metadataPathFor(folderPath) {
  return path.join(folderPath, METADATA_FILENAME);
}

async function findNearestMetadata(startPath) {
  let currentPath = path.resolve(startPath);

  while (true) {
    const metadata = await readMetadata(currentPath);
    if (Array.isArray(metadata.operations) && metadata.operations.length > 0) {
      return { metadataFolder: currentPath, metadata };
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }

  return {
    metadataFolder: path.resolve(startPath),
    metadata: { operations: [] }
  };
}

function latestPendingOrganizeOperation(metadata) {
  if (!Array.isArray(metadata.operations)) {
    return null;
  }

  return [...metadata.operations]
    .reverse()
    .find((record) => record.type === "organize" && !record.restoredAt);
}

function latestRestoredOrganizeOperation(metadata) {
  if (!Array.isArray(metadata.operations)) {
    return null;
  }

  return [...metadata.operations]
    .reverse()
    .find((record) => record.type === "organize" && !!record.restoredAt);
}

async function resolveAvailableDestination(initialPath, usedTargets) {
  const parsed = path.parse(initialPath);
  let counter = 0;

  while (true) {
    const candidate =
      counter === 0
        ? initialPath
        : path.join(parsed.dir, `${parsed.name}_${counter}${parsed.ext}`);

    if (usedTargets.has(candidate)) {
      counter += 1;
      continue;
    }

    try {
      await fs.access(candidate);
      counter += 1;
      continue;
    } catch (error) {
      if (error.code === "ENOENT") {
        usedTargets.add(candidate);
        return candidate;
      }
      throw error;
    }
  }
}

async function readMetadata(folderPath) {
  const filePath = metadataPathFor(folderPath);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { operations: [] };
    }

    const wrapped = new Error("Failed to read metadata file.");
    wrapped.statusCode = 500;
    throw wrapped;
  }
}

async function writeMetadata(folderPath, metadata) {
  const filePath = metadataPathFor(folderPath);
  const payload = JSON.stringify(metadata, null, 2);
  await fs.writeFile(filePath, payload, "utf8");
}

async function listOrganizableFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name !== METADATA_FILENAME)
    .map((entry) => {
      const source = path.join(folderPath, entry.name);
      const extension = normalizeExtension(entry.name);
      const category = EXTENSION_MAP.get(extension) || "Others";
      const destination = path.join(folderPath, category, entry.name);
      return {
        category,
        destination,
        extension,
        source
      };
    });
}

function buildPreviewResult(items) {
  const total = items.length;
  const preview = items.slice(0, MAX_PREVIEW_ITEMS).map((item) => ({
    from: item.source,
    to: item.destination,
    category: item.category
  }));

  return {
    total,
    preview,
    truncated: total > MAX_PREVIEW_ITEMS
  };
}

async function previewOrganize(folderPath) {
  const items = await listOrganizableFiles(folderPath);
  return buildPreviewResult(items);
}

async function organize(folderPath) {
  const candidates = await listOrganizableFiles(folderPath);

  if (candidates.length === 0) {
    return {
      movedCount: 0,
      operationId: null,
      skippedCount: 0
    };
  }

  const seenTargets = new Set();
  const movedItems = [];

  for (const item of candidates) {
    await fs.mkdir(path.dirname(item.destination), { recursive: true });

    const uniqueDest = makeUniquePath(item.destination, seenTargets);

    try {
      await fs.access(uniqueDest);
      const finalDest = makeUniquePath(uniqueDest, seenTargets);
      await fs.rename(item.source, finalDest);
      movedItems.push({
        from: item.source,
        to: finalDest,
        category: item.category
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.rename(item.source, uniqueDest);
        movedItems.push({
          from: item.source,
          to: uniqueDest,
          category: item.category
        });
      } else {
        throw error;
      }
    }
  }

  const metadata = await readMetadata(folderPath);
  const operationId = crypto.randomUUID();

  metadata.operations.push({
    id: operationId,
    type: "organize",
    folderPath,
    createdAt: new Date().toISOString(),
    restoredAt: null,
    items: movedItems
  });

  await writeMetadata(folderPath, metadata);

  return {
    movedCount: movedItems.length,
    operationId,
    skippedCount: 0
  };
}

async function restore(folderPath) {
  const { metadataFolder, metadata } = await findNearestMetadata(folderPath);
  const operation = latestPendingOrganizeOperation(metadata);

  if (!operation) {
    const restoredCount = await fallbackRestoreFromCategoryFolders(folderPath);
    if (restoredCount > 0) {
      return {
        operationId: null,
        restoredCount,
        mode: "fallback"
      };
    }

    const error = new Error(
      "No restorable operation found in metadata and no categorized files were found to restore."
    );
    error.statusCode = 400;
    throw error;
  }

  const usedTargets = new Set();
  let restoredCount = 0;

  for (const item of operation.items) {
    const toPath = makeUniquePath(item.from, usedTargets);

    try {
      await fs.mkdir(path.dirname(toPath), { recursive: true });
      await fs.rename(item.to, toPath);
      restoredCount += 1;
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  operation.restoredAt = new Date().toISOString();
  await writeMetadata(metadataFolder, metadata);

  await cleanupEmptyCategoryFolders(operation.folderPath || metadataFolder);

  return {
    operationId: operation.id,
    restoredCount
  };
}

async function undo(folderPath) {
  const { metadata } = await findNearestMetadata(folderPath);
  const pending = latestPendingOrganizeOperation(metadata);

  if (!pending) {
    const error = new Error("No operations available to undo.");
    error.statusCode = 400;
    throw error;
  }

  return restore(folderPath);
}

async function redo(folderPath) {
  const { metadataFolder, metadata } = await findNearestMetadata(folderPath);

  const pending = latestPendingOrganizeOperation(metadata);
  if (pending) {
    const error = new Error("Cannot redo because an organize operation is already active.");
    error.statusCode = 400;
    throw error;
  }

  const operation = latestRestoredOrganizeOperation(metadata);
  if (!operation) {
    const error = new Error("No operation available to redo.");
    error.statusCode = 400;
    throw error;
  }

  const usedTargets = new Set();
  let movedCount = 0;

  for (const item of operation.items) {
    try {
      await fs.access(item.from);
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const toPath = await resolveAvailableDestination(item.to, usedTargets);
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.rename(item.from, toPath);
    item.to = toPath;
    movedCount += 1;
  }

  operation.restoredAt = null;
  await writeMetadata(metadataFolder, metadata);

  return {
    operationId: operation.id,
    redoneCount: movedCount
  };
}

async function cleanupEmptyCategoryFolders(folderPath) {
  const categoryNames = [...Object.keys(DEFAULT_CATEGORIES), "Others"];

  for (const categoryName of categoryNames) {
    const categoryPath = path.join(folderPath, categoryName);

    try {
      await removeEmptyDirectoriesRecursively(categoryPath);
      await fs.rmdir(categoryPath);
    } catch {
      continue;
    }
  }
}

async function fallbackRestoreFromCategoryFolders(folderPath) {
  const categoryNames = [...Object.keys(DEFAULT_CATEGORIES), "Others"];
  const usedTargets = new Set();
  let restoredCount = 0;

  for (const categoryName of categoryNames) {
    const categoryPath = path.join(folderPath, categoryName);

    let files = [];
    try {
      files = await listFilesRecursive(categoryPath);
    } catch {
      continue;
    }

    for (const sourcePath of files) {
      const destinationPath = makeUniquePath(
        path.join(folderPath, path.basename(sourcePath)),
        usedTargets
      );

      try {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.rename(sourcePath, destinationPath);
        restoredCount += 1;
      } catch {
        continue;
      }
    }
  }

  if (restoredCount > 0) {
    await cleanupEmptyCategoryFolders(folderPath);
  }

  return restoredCount;
}

async function listFilesRecursive(rootPath) {
  const results = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    let entries;

    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

async function removeEmptyDirectoriesRecursively(rootPath) {
  let entries;
  try {
    entries = await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const childDir = path.join(rootPath, entry.name);
    await removeEmptyDirectoriesRecursively(childDir);
    try {
      await fs.rmdir(childDir);
    } catch {
      continue;
    }
  }
}

module.exports = {
  organize,
  previewOrganize,
  redo,
  restore,
  undo
};
