const { v4: uuidv4 } = require("uuid");
const { getVectorDbClass } = require("../utils/helpers");
const prisma = require("../utils/prisma");
const { Telemetry } = require("./telemetry");
const { EventLogs } = require("./eventLogs");
const { safeJsonParse } = require("../utils/http");
const { getModelTag } = require("../endpoints/utils");

const Document = {
  writable: ["pinned", "watched", "lastUpdatedAt"],
  /**
   * @param {import("@prisma/client").workspace_documents} document - Document PrismaRecord
   * @returns {{
   *  metadata: (null|object),
   *  type: import("./documentSyncQueue.js").validFileType,
   *  source: string
   * }}
   */
  parseDocumentTypeAndSource: function (document) {
    const metadata = safeJsonParse(document.metadata, null);
    if (!metadata) return { metadata: null, type: null, source: null };

    // Parse the correct type of source and its original source path.
    const idx = metadata.chunkSource.indexOf("://");
    const [type, source] = [
      metadata.chunkSource.slice(0, idx),
      metadata.chunkSource.slice(idx + 3),
    ];
    return { metadata, type, source: this._stripSource(source, type) };
  },

  forWorkspace: async function (workspaceId = null) {
    if (!workspaceId) return [];
    return await prisma.workspace_documents.findMany({
      where: { workspaceId },
    });
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspace_documents.deleteMany({ where: clause });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  get: async function (clause = {}) {
    try {
      const document = await prisma.workspace_documents.findFirst({
        where: clause,
      });
      return document || null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    include = null,
    select = null
  ) {
    try {
      const results = await prisma.workspace_documents.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
        ...(include !== null ? { include } : {}),
        ...(select !== null ? { select: { ...select } } : {}),
      });
      return results;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  addDocuments: async function (workspace, additions = [], userId = null) {
    const VectorDb = getVectorDbClass();
    if (additions.length === 0) return { failed: [], embedded: [] };
    const { fileData } = require("../utils/files");
    const embedded = [];
    const failedToEmbed = [];
    const errors = new Set();

    for (const path of additions) {
      const data = await fileData(path);
      if (!data) continue;

      const docId = uuidv4();
      const { pageContent: _pageContent, ...metadata } = data;
      const newDoc = {
        docId,
        filename: path.split("/")[1],
        docpath: path,
        workspaceId: workspace.id,
        metadata: JSON.stringify(metadata),
      };

      const { vectorized, error } = await VectorDb.addDocumentToNamespace(
        workspace.slug,
        { ...data, docId },
        path
      );

      if (!vectorized) {
        console.error(
          "Failed to vectorize",
          metadata?.title || newDoc.filename
        );
        failedToEmbed.push(metadata?.title || newDoc.filename);
        errors.add(error);
        continue;
      }

      try {
        await prisma.workspace_documents.create({ data: newDoc });
        embedded.push(path);
      } catch (error) {
        console.error(error.message);
      }

      if (metadata.graphMode) {
        try {
          const { cachedVectorInformation } = require("../utils/files");
          const cacheResult = await cachedVectorInformation(path);
          if (cacheResult.exists && cacheResult.chunks) {
            const allTextChunks = cacheResult.chunks.flat().map(c => c.metadata.text);
            
            const fs = require('fs');
            const pathModule = require('path');
            const { v4: mUuidv4 } = require('uuid');
            const os = require('os');
            const tmpFile = pathModule.resolve(os.tmpdir(), `tmp-chunks-${mUuidv4()}.json`);
            fs.writeFileSync(tmpFile, JSON.stringify(allTextChunks), 'utf8');

            const { ApiKey } = require("./apiKeys");
            let apiKeyRec = await ApiKey.get({}); 
            let keyStr = apiKeyRec?.secret;
            if (!keyStr) {
               const newKey = await ApiKey.create(1); 
               keyStr = newKey.apiKey.secret;
            }

            const { exec } = require('child_process');
            const ragAnythingDir = pathModule.resolve(__dirname, '../../RAG-Anything');
            const env = {
               ...process.env,
               WORKSPACE_SLUG: workspace.slug,
               CHUNKS_JSON_PATH: tmpFile,
               ANYTHING_LLM_API_KEY: keyStr,
               // NOTE: EMBEDDING_DIM is now auto-detected by graph_insert.py
               // by querying AnythingLLM's embedding endpoint with a test input.
               // This ensures compatibility with different embedding engines
               // (NativeEmbedder: 384, text-embedding-ada-002: 1536, etc.)
            };

            console.log(`[Graph Mode] Invoking Python Graph RAG insertion for workspace ${workspace.slug}`);
            exec(`python3 graph_insert.py`, { cwd: ragAnythingDir, env, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
               if (stderr) {
                 console.error(`[Graph Mode] Python stderr:`, stderr);
               }
               if (err) {
                 console.error(`Graph RAG insertion failed:`, err.message);
               } else {
                 console.log(`Graph RAG insertion completed:`, stdout);
               }
               
               if (fs.existsSync(tmpFile)) {
                 fs.unlinkSync(tmpFile);
               }
            });
          }
        } catch (e) {
          console.error("Error invoking Graph RAG:", e);
        }
      }
    }

    await Telemetry.sendTelemetry("documents_embedded_in_workspace", {
      LLMSelection: process.env.LLM_PROVIDER || "openai",
      Embedder: process.env.EMBEDDING_ENGINE || "inherit",
      VectorDbSelection: process.env.VECTOR_DB || "lancedb",
      TTSSelection: process.env.TTS_PROVIDER || "native",
      LLMModel: getModelTag(),
    });
    await EventLogs.logEvent(
      "workspace_documents_added",
      {
        workspaceName: workspace?.name || "Unknown Workspace",
        numberOfDocumentsAdded: additions.length,
      },
      userId
    );
    return { failedToEmbed, errors: Array.from(errors), embedded };
  },

  removeDocuments: async function (workspace, removals = [], userId = null) {
    const VectorDb = getVectorDbClass();
    if (removals.length === 0) return;

    for (const path of removals) {
      const document = await this.get({
        docpath: path,
        workspaceId: workspace.id,
      });
      if (!document) continue;
      await VectorDb.deleteDocumentFromNamespace(
        workspace.slug,
        document.docId
      );

      try {
        await prisma.workspace_documents.delete({
          where: { id: document.id, workspaceId: workspace.id },
        });
        await prisma.document_vectors.deleteMany({
          where: { docId: document.docId },
        });
      } catch (error) {
        console.error(error.message);
      }
    }

    await EventLogs.logEvent(
      "workspace_documents_removed",
      {
        workspaceName: workspace?.name || "Unknown Workspace",
        numberOfDocuments: removals.length,
      },
      userId
    );
    return true;
  },

  count: async function (clause = {}, limit = null) {
    try {
      const count = await prisma.workspace_documents.count({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return count;
    } catch (error) {
      console.error("FAILED TO COUNT DOCUMENTS.", error.message);
      return 0;
    }
  },
  update: async function (id = null, data = {}) {
    if (!id) throw new Error("No workspace document id provided for update");

    const validKeys = Object.keys(data).filter((key) =>
      this.writable.includes(key)
    );
    if (validKeys.length === 0)
      return { document: { id }, message: "No valid fields to update!" };

    try {
      const document = await prisma.workspace_documents.update({
        where: { id },
        data,
      });
      return { document, message: null };
    } catch (error) {
      console.error(error.message);
      return { document: null, message: error.message };
    }
  },
  _updateAll: async function (clause = {}, data = {}) {
    try {
      await prisma.workspace_documents.updateMany({
        where: clause,
        data,
      });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },
  content: async function (docId) {
    if (!docId) throw new Error("No workspace docId provided!");
    const document = await this.get({ docId: String(docId) });
    if (!document) throw new Error(`Could not find a document by id ${docId}`);

    const { fileData } = require("../utils/files");
    const data = await fileData(document.docpath);
    return { title: data.title, content: data.pageContent };
  },
  contentByDocPath: async function (docPath) {
    const { fileData } = require("../utils/files");
    const data = await fileData(docPath);
    return { title: data.title, content: data.pageContent };
  },

  // Some data sources have encoded params in them we don't want to log - so strip those details.
  _stripSource: function (sourceString, type) {
    if (["confluence", "github"].includes(type)) {
      const _src = new URL(sourceString);
      _src.search = ""; // remove all search params that are encoded for resync.
      return _src.toString();
    }

    return sourceString;
  },

  /**
   * Functions for the backend API endpoints - not to be used by the frontend or elsewhere.
   * @namespace api
   */
  api: {
    /**
     * Process a document upload from the API and upsert it into the database. This
     * functionality should only be used by the backend /v1/documents/upload endpoints for post-upload embedding.
     * @param {string} wsSlugs - The slugs of the workspaces to embed the document into, will be comma-separated list of workspace slugs
     * @param {string} docLocation - The location/path of the document that was uploaded
     * @returns {Promise<boolean>} - True if the document was uploaded successfully, false otherwise
     */
    uploadToWorkspace: async function (wsSlugs = "", docLocation = null) {
      if (!docLocation)
        return console.log(
          "No document location provided for embedding",
          docLocation
        );

      const slugs = wsSlugs
        .split(",")
        .map((slug) => String(slug)?.trim()?.toLowerCase());
      if (slugs.length === 0)
        return console.log(`No workspaces provided got: ${wsSlugs}`);

      const { Workspace } = require("./workspace");
      const workspaces = await Workspace.where({ slug: { in: slugs } });
      if (workspaces.length === 0)
        return console.log("No valid workspaces found for slugs: ", slugs);

      // Upsert the document into each workspace - do this sequentially
      // because the document may be large and we don't want to overwhelm the embedder, plus on the first
      // upsert we will then have the cache of the document - making n+1 embeds faster. If we parallelize this
      // we will have to do a lot of extra work to ensure that the document is not embedded more than once.
      for (const workspace of workspaces) {
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          [docLocation]
        );
        if (failedToEmbed.length > 0)
          return console.log(
            `Failed to embed document into workspace ${workspace.slug}`,
            errors
          );
        console.log(`Document embedded into workspace ${workspace.slug}...`);
      }

      return true;
    },
  },
};

module.exports = { Document };
