const web = require('./web');
const filesystem = require('./filesystem');
const execution = require('./execution');
const rag = require('./rag');
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
  rag_collection_info: rag.rag_collection_info,
  delegate: delegateTool.delegate,
  mutate_skill: mutateTool.mutate_skill
};

module.exports = tools;
