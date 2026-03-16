const web = require('./web');
const filesystem = require('./filesystem');
const execution = require('./execution');
const rag = require('./rag');
const ragGraph = require('./rag_graph');
const delegateTool = require('./delegate');
const mutateTool = require('./mutate_skill');

const tools = {
  web_search: web.web_search,
  web_fetch: web.web_fetch,
  read_file: filesystem.read_file,
  write_file: filesystem.write_file,
  append_file: filesystem.append_file,
  python_exec: execution.python_exec,
  bash_exec: execution.bash_exec,
  rag_query: rag.rag_query,
  rag_graph_query: ragGraph.rag_graph_query,
  delegate: delegateTool.delegate.execute,
  mutate_skill: mutateTool.mutate_skill.execute
};

module.exports = tools;
