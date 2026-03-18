const path = require("path");
const fs = require("fs");
const {
  WATCH_DIRECTORY,
  SUPPORTED_FILETYPE_CONVERTERS,
} = require("../utils/constants");
const {
  trashFile,
  isTextType,
  normalizePath,
  isWithin,
  documentsFolder,
} = require("../utils/files");
const RESERVED_FILES = ["__HOTDIR__.md"];

/**
 * Process a single file and return the documents
 * @param {string} targetFilename - The filename to process
 * @param {Object} options - The options for the file processing
 * @param {boolean} options.parseOnly - If true, the file will not be saved as a document even when `writeToServerDocuments` is called in the handler. Must be explicitly set to true to use.
 * @param {Object} metadata - The metadata for the file processing
 * @returns {Promise<{success: boolean, reason: string, documents: Object[]}>} - The documents from the file processing
 */
async function processSingleFile(targetFilename, options = {}, metadata = {}) {
  const fullFilePath = path.resolve(
    WATCH_DIRECTORY,
    normalizePath(targetFilename)
  );
  if (!isWithin(path.resolve(WATCH_DIRECTORY), fullFilePath))
    return {
      success: false,
      reason: "Filename is a not a valid path to process.",
      documents: [],
    };

  if (RESERVED_FILES.includes(targetFilename))
    return {
      success: false,
      reason: "Filename is a reserved filename and cannot be processed.",
      documents: [],
    };
  if (!fs.existsSync(fullFilePath))
    return {
      success: false,
      reason: "File does not exist in upload directory.",
      documents: [],
    };

  const fileExtension = path.extname(fullFilePath).toLowerCase();

  // COPY ORIGINAL RAW FILE FOR GRAPH RAG
  // We ALWAYS copy the raw file because the user might toggle "Graph Mode"
  // later when adding the document to a workspace, at which point the hotdir file would be gone.
  try {
    const rawDir = path.resolve(documentsFolder, "raw");
    const destPath = path.resolve(rawDir, targetFilename);
    const destDirName = path.dirname(destPath);
    if (!fs.existsSync(destDirName)) fs.mkdirSync(destDirName, { recursive: true });
    fs.copyFileSync(fullFilePath, destPath);
    console.log(`[Collector] Copied raw file ${targetFilename} to ${rawDir} for future Graph Mode use.`);
  } catch (err) {
    console.error("[Collector] Failed to copy raw file for Graph RAG:", err);
  }

  if (fullFilePath.includes(".") && !fileExtension) {
    return {
      success: false,
      reason: `No file extension found. This file cannot be processed.`,
      documents: [],
    };
  }

  let processFileAs = fileExtension;
  if (!SUPPORTED_FILETYPE_CONVERTERS.hasOwnProperty(fileExtension)) {
    if (isTextType(fullFilePath)) {
      console.log(
        `\x1b[33m[Collector]\x1b[0m The provided filetype of ${fileExtension} does not have a preset and will be processed as .txt.`
      );
      processFileAs = ".txt";
    } else {
      trashFile(fullFilePath);
      return {
        success: false,
        reason: `File extension ${fileExtension} not supported for parsing and cannot be assumed as text file type.`,
        documents: [],
      };
    }
  }

  const FileTypeProcessor = require(SUPPORTED_FILETYPE_CONVERTERS[
    processFileAs
  ]);
  return await FileTypeProcessor({
    fullFilePath,
    filename: targetFilename,
    options,
    metadata,
  });
}

module.exports = {
  processSingleFile,
};
