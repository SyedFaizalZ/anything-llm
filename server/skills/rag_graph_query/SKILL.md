---
name: rag_graph_query
description: "Queries the Graph RAG knowledge base for relational and holistic information from documents in the workspace. Use this when the user specifically asks to use the Graph RAG tool or when the query requires synthesizing relationships between multiple concepts."
category: knowledge
triggers:
  - "graph search"
  - "graph rag"
  - "graph query"
  - "relational query"
  - "holistic summary"
  - "rag_graph_query"
allowed_tools:
  - rag_graph_query
---

# Graph RAG Query Skill

This skill allows the agent to simultaneously query the standard vector database and the advanced Graph RAG knowledge base for the current workspace.

## Details

The `rag_graph_query` tool is designed for complex queries that require understanding relationships between entities, concepts, or documents. It executes:
1. A standard semantic search against AnythingLLM's local ChromaDB.
2. An advanced Graph Knowledge retrieval using the `RAG-Anything` Python backend.

Both results are synthesized into a unified answer.

## Usage
Simply invoke the `rag_graph_query` tool with the user's query as the input. The tool automatically resolves the workspace context.
