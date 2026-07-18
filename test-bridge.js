const { chatAgentWithLLM } = require('./llm-bridge.js');
const graph = { url: 'https://google.com', title: 'Google', elements: [ { id: 'BTN_1', text: 'test' } ] };
const previousActions = [];
const sender = {};
const memory = '';
const conversationHistory = [];
const silent = false;
const pageSummary = '';
const taskScratchpad = '';
const graphQuery = { type: 'buttons' };

chatAgentWithLLM('test prompt', graph, previousActions, sender, memory, conversationHistory, silent, pageSummary, taskScratchpad, graphQuery)
  .then(console.log)
  .catch(console.error);
