---
name: write-blog
description: Writes a full blog post with research, outline, draft and SEO meta
triggers: ["write a blog post", "write an article", "create content about", "write a blog"]
negative_triggers: ["edit blog", "fix blog"]
allowed_tools: ["web_search", "write_file"]
category: content
dependencies: []
---

## Workflow

1. Use web_search to research the topic (3-5 searches).
2. Build an outline from the research.
3. Write the full draft section by section.
4. Add SEO title, meta description, and tags.
5. Save to file using write_file.
