const path = require("node:path");

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";
const BROWSER_SCOPE_HOME_ONLY = String(process.env.BROWSER_SCOPE_HOME_ONLY || "true").toLowerCase() !== "false";

const METADATA_FILENAME = ".file_organizer_metadata.json";
const DEFAULT_CATEGORIES = {
  Images: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"],
  Videos: [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm"],
  Documents: [".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx", ".xls", ".xlsx", ".csv"],
  Audio: [".mp3", ".wav", ".aac", ".flac", ".ogg"],
  Archives: [".zip", ".rar", ".7z", ".tar", ".gz"]
};

const MAX_PREVIEW_ITEMS = 200;
const APP_ROOT = path.resolve(__dirname, "..");

module.exports = {
  APP_ROOT,
  BROWSER_SCOPE_HOME_ONLY,
  DEFAULT_CATEGORIES,
  HOST,
  MAX_PREVIEW_ITEMS,
  METADATA_FILENAME,
  PORT
};
