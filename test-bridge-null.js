const { chatAgentWithLLM } = require('./llm-bridge.js');
const graph = { url: 'https://google.com', title: 'Google', elements: [ { id: 'BTN_1', text: 'test' } ] };

chatAgentWithLLM('test prompt', graph, [], {}, '', [], false, '', '', null)
  .then(console.log)
  .catch(console.error);
