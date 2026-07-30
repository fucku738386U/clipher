/* API */
const API_BASE = '';

async function api(action, params = {}, model = null) {
  const body = { action, params };
  if (model) body.model = model;

  const settings = loadStorage('settings', {});
  if (settings.model && !model) body.model = settings.model;
  if (settings.temperature !== undefined && action === 'chat') {
    params.temperature = settings.temperature;
    params.max_tokens = settings.maxTokens;
    if (settings.systemPrompt) params.system = settings.systemPrompt;
  }

  const res = await fetch(API_BASE + '/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiChat(text, onStream = null) {
  const settings = loadStorage('settings', {});
  const params = { text };
  if (settings.temperature !== undefined) {
    params.temperature = settings.temperature;
    params.max_tokens = settings.maxTokens;
    params.top_p = settings.topP;
  }
  if (settings.systemPrompt) params.system = settings.systemPrompt;

  const body = {
    action: 'chat',
    params,
    model: settings.model || 'nvidia/nemotron-3-super-120b-a12b:free'
  };

  const res = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiAgent(command) {
  return api('agent', { command });
}

async function apiAgentStatus(taskId) {
  const res = await fetch('/api/agent_status?task_id=' + taskId);
  return res.json();
}

async function apiShell(cmd) {
  return api('shell', { cmd });
}

async function apiPython(code) {
  return api('python', { code });
}

async function apiSearch(query) {
  return api('search', { query });
}

async function apiScrape(url) {
  return api('scrape', { url });
}

async function apiReadFile(path) {
  return api('read_file', { path });
}

async function apiWriteFile(path, content) {
  return api('write_file', { path, content });
}

async function apiListDir(path = '.') {
  return api('list_dir', { path });
}

async function apiSystem() {
  return api('system');
}
