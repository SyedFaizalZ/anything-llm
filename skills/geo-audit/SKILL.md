---
name: geo-audit
description: GEO audit for AI search engine visibility.
triggers: ["geo audit", "AI search visibility", "optimize for AI", "check my site for AI"]
negative_triggers: []
allowed_tools: ["web_fetch", "web_search", "write_file"]
category: seo
dependencies: []
---

## Workflow

1. Use `web_search` and `web_fetch` to analyze the site and its visibility.
2. Produce an audit report outlining how visible the site is to AI search engines (like Perplexity, ChatGPT web search).
3. Save the report to a file using `write_file`.
