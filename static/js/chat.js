/* Chat Engine */
let isStreaming = false;
let currentAbort = null;

async function sendMessage() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text || isStreaming) return;

  if (!currentChatId) createChat();

  // Add user message
  addMessage(currentChatId, 'user', text);
  input.value = '';
  input.style.height = 'auto';
  showMessages();
  renderMessages(chats.find(c => c.id === currentChatId).messages);

  // Check active tools
  const activeTools = $$('.chip.active').map(c => c.dataset.tool);
  const lowerText = text.toLowerCase();

  // Auto-detect if auto mode is on
  if (settings.autoMode && activeTools.length === 0) {
    if (lowerText.includes('code') || lowerText.includes('script') || lowerText.includes('python')) {
      activeTools.push('python');
    } else if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('google')) {
      activeTools.push('search');
    } else if (lowerText.includes('shell') || lowerText.includes('run') || lowerText.includes('command') || lowerText.includes('terminal')) {
      activeTools.push('terminal');
    } else if (lowerText.includes('debug') || lowerText.includes('fix') || lowerText.includes('error')) {
      activeTools.push('think');
    } else if (lowerText.includes('research') || lowerText.includes('analyze') || lowerText.includes('investigate')) {
      activeTools.push('agent');
    }
  }

  // Handle tool-specific flows
  if (activeTools.includes('agent')) {
    await runAgent(text);
    return;
  }

  if (activeTools.includes('terminal')) {
    await runTerminal(text);
    return;
  }

  if (activeTools.includes('python')) {
    await runPython(text);
    return;
  }

  if (activeTools.includes('search')) {
    await runSearch(text);
    return;
  }

  // Normal chat
  await streamChat(text);
}

async function streamChat(text) {
  isStreaming = true;
  $('#send-btn').disabled = true;

  // Add typing indicator
  const typingId = 'typing-' + uuid();
  const chat = chats.find(c => c.id === currentChatId);

  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = typingId;
  typingDiv.innerHTML = `
    <div class="message-avatar">C</div>
    <div class="message-content">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  $('#messages').appendChild(typingDiv);
  scrollToBottom();

  try {
    const res = await apiChat(text);

    // Remove typing
    typingDiv.remove();

    if (res.result) {
      addMessage(currentChatId, 'assistant', res.result);
      renderMessages(chat.messages);
    } else if (res.error) {
      addMessage(currentChatId, 'assistant', '[Error] ' + res.error);
      renderMessages(chat.messages);
    }
  } catch(e) {
    typingDiv.remove();
    addMessage(currentChatId, 'assistant', '[Error] ' + e.message);
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    $('#send-btn').disabled = false;
  }
}

async function runSearch(text) {
  isStreaming = true;
  $('#send-btn').disabled = true;

  // Extract query
  const query = text.replace(/search for|search|find|lookup/gi, '').trim() || text;

  // Add assistant message with search card
  const msgId = uuid();
  const chat = chats.find(c => c.id === currentChatId);

  const div = document.createElement('div');
  div.className = 'message assistant';
  div.dataset.id = msgId;
  div.innerHTML = `
    <div class="message-avatar">C</div>
    <div class="message-content">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--accent-light)">
        ${ICONS.loader} Searching...
      </div>
      <div class="search-results"></div>
    </div>
  `;
  $('#messages').appendChild(div);
  scrollToBottom();

  try {
    const res = await apiSearch(query);
    const results = res.result?.results || [];

    const resultsHtml = results.length > 0 
      ? '<ul style="margin:0;padding-left:18px">' + results.map(r => `<li style="margin-bottom:6px">${escapeHtml(r)}</li>`).join('') + '</ul>'
      : '<p>No results found.</p>';

    // Now get AI summary
    const summaryPrompt = `Based on these search results for "${query}":\n\n${results.join('\n')}\n\nProvide a concise summary.`;
    const aiRes = await apiChat(summaryPrompt);

    const content = `**Search Results for "${escapeHtml(query)}"**\n\n${resultsHtml}\n\n**Summary:**\n${aiRes.result || 'No summary available.'}`;

    addMessage(currentChatId, 'assistant', content, { format: 'html' });
    div.remove();
    renderMessages(chat.messages);
  } catch(e) {
    addMessage(currentChatId, 'assistant', '[Search Error] ' + e.message);
    div.remove();
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    $('#send-btn').disabled = false;
  }
}

async function runTerminal(text) {
  isStreaming = true;
  $('#send-btn').disabled = true;

  // Extract command
  let cmd = text;
  const cmdMatch = text.match(/`{1,3}([^`]+)`{1,3}/);
  if (cmdMatch) cmd = cmdMatch[1];

  const msgId = uuid();
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.dataset.id = msgId;
  div.innerHTML = `
    <div class="message-avatar">C</div>
    <div class="message-content">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--accent-light)">
        ${ICONS.loader} Executing...
      </div>
      <div class="terminal-output">$ ${escapeHtml(cmd)}\n...</div>
    </div>
  `;
  $('#messages').appendChild(div);
  scrollToBottom();

  try {
    const res = await apiShell(cmd);
    const data = res.result || {};

    let output = `<div class="cmd">$ ${escapeHtml(data.cmd || cmd)}</div>`;
    if (data.stdout) output += `<div class="stdout">${escapeHtml(data.stdout)}</div>`;
    if (data.stderr) output += `<div class="stderr">${escapeHtml(data.stderr)}</div>`;
    if (data.error) output += `<div class="stderr">Error: ${escapeHtml(data.error)}</div>`;

    const content = `**Terminal Output**\n\n<div class="terminal-output">${output}</div>`;

    addMessage(currentChatId, 'assistant', content, { format: 'html' });
    div.remove();
    renderMessages(chat.messages);
  } catch(e) {
    addMessage(currentChatId, 'assistant', '[Terminal Error] ' + e.message);
    div.remove();
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    $('#send-btn').disabled = false;
  }
}

async function runPython(text) {
  isStreaming = true;
  $('#send-btn').disabled = true;

  // Extract code
  let code = text;
  const codeMatch = text.match(/`{1,3}(?:python)?\n?([\s\S]*?)`{1,3}/);
  if (codeMatch) code = codeMatch[1];

  const msgId = uuid();
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.dataset.id = msgId;
  div.innerHTML = `
    <div class="message-avatar">C</div>
    <div class="message-content">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--accent-light)">
        ${ICONS.loader} Running Python...
      </div>
    </div>
  `;
  $('#messages').appendChild(div);
  scrollToBottom();

  try {
    const res = await apiPython(code);
    const data = res.result || {};

    let content = '';
    if (data.output) {
      content = `**Python Output**\n\n<pre><code>${escapeHtml(data.output)}</code></pre>`;
    } else if (data.error) {
      content = `**Python Error**\n\n<pre><code style="color:var(--error)">${escapeHtml(data.error + '\n' + (data.traceback || ''))}</code></pre>`;
    } else {
      content = 'No output.';
    }

    addMessage(currentChatId, 'assistant', content, { format: 'html' });
    div.remove();
    renderMessages(chat.messages);
  } catch(e) {
    addMessage(currentChatId, 'assistant', '[Python Error] ' + e.message);
    div.remove();
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    $('#send-btn').disabled = false;
  }
}
