const { exec } = require("child_process");
const path = require("path");
const { ApiKey } = require("../../models/apiKeys");
const { rag_query } = require("./rag");

class RAGGraphTools {
  static async rag_graph_query({ query, workspace }) {
    try {
      if (!workspace) return "Error: No workspace context provided for RAG query.";

      console.log(`[RAG Graph] Executing Graph RAG Query Tool for ${workspace.slug}`);
      
      // We still run the traditional AnythingLLM RAG search
      const traditionalRagTask = rag_query({ query, workspace });

      // Run Python script for graph retrieval
      const graphRagTask = new Promise(async (resolve) => {
        try {
          let apiKeyRec = await ApiKey.get({});
          let keyStr = apiKeyRec?.secret;
          if (!keyStr) {
            const newKey = await ApiKey.create(1);
            keyStr = newKey.apiKey.secret;
          }

          const ragAnythingDir = path.resolve(__dirname, "../../../RAG-Anything");
          const env = {
            ...process.env,
            WORKSPACE_SLUG: workspace.slug,
            GRAPH_QUERY: query,
            ANYTHING_LLM_API_KEY: keyStr,
            // NOTE: EMBEDDING_DIM is now auto-detected by graph_query.py
            // No need to hardcode it - the script will detect it dynamically
          };

          exec(`python3 graph_query.py`, { cwd: ragAnythingDir, env, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
            if (stderr) {
              console.error(`[RAG Graph] Python stderr:`, stderr);
            }
            if (err) {
              console.error(`Graph Query Error:`, err.message);
              resolve(`[Graph Retrieval Error]: ${err.message}`);
            } else {
              resolve(stdout);
            }
          });
        } catch (e) {
          console.error("Graph RAG task setup error:", e);
          resolve("");
        }
      });

      const [traditionalRagResponse, graphRagResponse] = await Promise.all([
        traditionalRagTask,
        graphRagTask,
      ]);

      let combinedResponse = "--- Standard Semantic Search Results ---\n";
      combinedResponse += traditionalRagResponse + "\n\n";
      
      if (graphRagResponse) {
        if (graphRagResponse.includes("--- GRAPH RAG RESULTS ---")) {
          const graphContent = graphRagResponse.split("--- GRAPH RAG RESULTS ---")[1].split("-----------------------")[0].trim();
          if (graphContent) {
             combinedResponse += "--- Graph Knowledge Results ---\n";
             combinedResponse += graphContent + "\n\n";
          }
        } else {
          // If the Python script ran but didn't output the expected format (e.g., error messages)
          combinedResponse += "--- Graph Knowledge Output (Raw) ---\n";
          combinedResponse += graphRagResponse.trim() + "\n\n";
        }
      }

      return combinedResponse;
    } catch (e) {
      return `RAG Graph query error: ${e.message}`;
    }
  }
}

module.exports = {
  rag_graph_query: RAGGraphTools.rag_graph_query
};
