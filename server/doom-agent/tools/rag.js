const { getVectorDbClass, getLLMProvider } = require("../../utils/helpers");

class RAGTools {
  // We expect the workspace parameter to be injected by the runner
  static async rag_query({ query, workspace }) {
    try {
      if (!workspace) return "Error: No workspace context provided for RAG query.";

      const VectorDb = getVectorDbClass();
      const LLMConnector = getLLMProvider({
        provider: workspace.chatProvider,
        model: workspace.chatModel,
      });

      const embeddingsCount = await VectorDb.namespaceCount(workspace.slug);
      if (embeddingsCount === 0) {
        return "No documents found in the current workspace knowledge base.";
      }

      const results = await VectorDb.performSimilaritySearch({
        namespace: workspace.slug,
        input: query,
        LLMConnector,
        similarityThreshold: workspace.similarityThreshold,
        topN: workspace.topN || 5,
        filterIdentifiers: [],
        rerank: workspace.vectorSearchMode === "rerank",
      });

      if (results.message) {
        return `RAG search failed: ${results.message}`;
      }

      if (!results.sources || results.sources.length === 0) {
        return "No relevant documents found for this query.";
      }

      const chunks = results.sources.map((s, i) => {
        const source = s.title || s.source || "Unknown source";
        return `--- Chunk ${i + 1} (Source: ${source}) ---\n${s.text}`;
      });

      return chunks.join('\n\n');
    } catch (e) {
      return `RAG query error: ${e.message}`;
    }
  }

  static async rag_collection_info({ workspace }) {
    if (!workspace) return "Error: No workspace context provided.";
    try {
      const VectorDb = getVectorDbClass();
      const count = await VectorDb.namespaceCount(workspace.slug);
      return `Workspace: ${workspace.name}\nSlug: ${workspace.slug}\nDocument Chunks: ${count}`;
    } catch (e) {
      return `RAG collection info error: ${e.message}`;
    }
  }
}

module.exports = {
  rag_query: RAGTools.rag_query,
  rag_collection_info: RAGTools.rag_collection_info
};
