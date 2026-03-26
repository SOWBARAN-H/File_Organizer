const express = require("express");
const path = require("node:path");

const {
  assertPathAllowed,
  getBrowseRoots,
  listChildDirectories
} = require("../utils/folderBrowser");

const router = express.Router();

router.get("/roots", async (req, res, next) => {
  try {
    const roots = await getBrowseRoots();
    res.json({
      success: true,
      message: "Browse roots loaded.",
      data: { roots }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/list", async (req, res, next) => {
  try {
    const requestedPath = req.body?.path;

    if (!requestedPath) {
      const roots = await getBrowseRoots();
      return res.json({
        success: true,
        message: "Browse roots loaded.",
        data: {
          currentPath: null,
          parentPath: null,
          directories: roots.map((rootPath) => ({
            name: rootPath,
            path: rootPath
          })),
          roots
        }
      });
    }

    const { resolvedPath, roots } = await assertPathAllowed(requestedPath);
    const directories = await listChildDirectories(resolvedPath);

    const parentPath = path.dirname(resolvedPath);
    const parentAllowed = parentPath !== resolvedPath && roots.some((root) => {
      const relative = path.relative(path.resolve(root), parentPath);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });

    return res.json({
      success: true,
      message: "Directory listing loaded.",
      data: {
        currentPath: resolvedPath,
        parentPath: parentAllowed ? parentPath : null,
        directories,
        roots
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
