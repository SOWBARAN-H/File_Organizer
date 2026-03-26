const express = require("express");

const {
  organize,
  previewOrganize,
  redo,
  restore,
  undo
} = require("../services/fileOrganizerService");
const { validateDirectoryPath } = require("../utils/pathUtils");

const router = express.Router();

router.post("/preview", async (req, res, next) => {
  try {
    const folderPath = await validateDirectoryPath(req.body?.folderPath);
    const data = await previewOrganize(folderPath);
    res.json({
      success: true,
      message: "Preview generated.",
      data
    });
  } catch (error) {
    next(error);
  }
});

router.post("/organize", async (req, res, next) => {
  try {
    const folderPath = await validateDirectoryPath(req.body?.folderPath);
    const data = await organize(folderPath);
    res.json({
      success: true,
      message: "Organization completed.",
      data
    });
  } catch (error) {
    next(error);
  }
});

router.post("/restore", async (req, res, next) => {
  try {
    const folderPath = await validateDirectoryPath(req.body?.folderPath);
    const data = await restore(folderPath);
    res.json({
      success: true,
      message: "Restore completed.",
      data
    });
  } catch (error) {
    next(error);
  }
});

router.post("/undo", async (req, res, next) => {
  try {
    const folderPath = await validateDirectoryPath(req.body?.folderPath);
    const data = await undo(folderPath);
    res.json({
      success: true,
      message: "Undo completed.",
      data
    });
  } catch (error) {
    next(error);
  }
});

router.post("/redo", async (req, res, next) => {
  try {
    const folderPath = await validateDirectoryPath(req.body?.folderPath);
    const data = await redo(folderPath);
    res.json({
      success: true,
      message: "Redo completed.",
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
