---
name: rag-query
description: Queries the AnythingLLM document knowledge base to find relevant information about user documents.
triggers: ["search my docs", "find in documents", "what does my knowledge base say about", "search documents"]
negative_triggers: ["write a blog", "search the web"]
allowed_tools: ["rag_query", "rag_collection_info"]
category: knowledge
dependencies: []
---

## Workflow

1. Use `rag_collection_info` to get the context about the attached documents.
2. Use `rag_query` to search the knowledge base for the most relevant context based on the user's query.
3. Synthesize a complete answer for the user solely based on the retrieved document context.
