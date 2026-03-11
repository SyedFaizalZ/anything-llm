class WebTools {
  static async web_search({ query }) {
    return `[web_search stub] Query: '${query}'. Add Serper/Tavily API key to integrate fully.`; 
  }

  static async web_fetch({ url }) {
    try {
      const fetch = require('node-fetch');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const html = await res.text();
      // basic html tag strip
      const text = html.replace(/<[^>]*>?/gm, '');
      return text.substring(0, 8000);
    } catch (e) {
      return `Failed to fetch URL ${url}. Error: ${e.message}`;
    }
  }
}

module.exports = {
  web_search: WebTools.web_search,
  web_fetch: WebTools.web_fetch
};
