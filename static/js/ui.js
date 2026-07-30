/* UI Controller */
let currentChatId = null;
let chats = loadStorage('chats', []);
let settings = loadStorage('settings', {
  model: 'nvidia/nemotron-3-super-120b-a12b:free',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  theme: 'dark',
  autoMode: true,
  systemPrompt: ''
});

const MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 Super 120B', provider: 'NVIDIA', desc: 'Powerful open model', free: true },
  { id: 'meta-llama/llama-3.1-405b-instruct:free', name: 'Meta Llama 3.1 405B', provider: 'Meta', desc: 'Massive open model', free: true },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash', provider: 'Google', desc: 'Fast multimodal', free: true },
  { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek Chat', provider: 'DeepSeek', desc: 'Strong reasoning', free: true },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B', provider: 'Alibaba', desc: 'Bilingual powerhouse', free: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', desc: 'Best coding & analysis', free: false },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', desc: 'Top-tier general purpose', free: false },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral', desc: 'European excellence', free: false },
];

function initUI() {
  renderChatList();
  renderModelList();
  initSettings();
  initEventListeners();
  applyTheme(settings.theme);

  // Check for active tools
  const activeTools = loadStorage('activeTools', []);
  activeTools.forEach(t => toggleChip(t, true));
}

function renderChatList() {
  const list = $('#chat-list');
  const pinned = $('#pinned-list');
  if (!list) return;

  list.innerHTML = '';
  pinned.innerHTML = '';

  const sorted = [...chats].sort((a, b) => (b.updated || 0) - (a.updated || 0));

  sorted.forEach(chat => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
    el.innerHTML = ICONS.message + '<span>' + escapeHtml(chat.title || 'New Chat') + '</span>';
    el.onclick = () => loadChat(chat.id);

    if (chat.pinned) {
      pinned.appendChild(el);
    } else {
      list.appendChild(el);
    }
  });
}

function createChat() {
  const chat = {
    id: uuid(),
    title: 'New Chat',
    messages: [],
    created: Date.now(),
    updated: Date.now(),
    pinned: false
  };
  chats.unshift(chat);
  saveStorage('chats', chats);
  currentChatId = chat.id;
  renderChatList();
  showWelcome();
  return chat;
}

function loadChat(id) {
  currentChatId = id;
  renderChatList();
  const chat = chats.find(c => c.id === id);
  if (!chat || chat.messages.length === 0) {
    showWelcome();
  } else {
    showMessages();
    renderMessages(chat.messages);
  }
}

function showWelcome() {
  $('#welcome').style.display = 'flex';
  $('#messages').classList.remove('active');
}

function showMessages() {
  $('#welcome').style.display = 'none';
  $('#messages').classList.add('active');
}

function updateChatTitle(id, title) {
  const chat = chats.find(c => c.id === id);
  if (chat) {
    chat.title = title.slice(0, 40);
    chat.updated = Date.now();
    saveStorage('chats', chats);
    renderChatList();
  }
}

function addMessage(chatId, role, content, meta = {}) {
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return null;

  const msg = { id: uuid(), role, content, time: Date.now(), ...meta };
  chat.messages.push(msg);
  chat.updated = Date.now();

  if (chat.messages.length === 1 && role === 'user') {
    chat.title = content.slice(0, 40) || 'New Chat';
  }

  saveStorage('chats', chats);
  renderChatList();
  return msg;
}

function renderMessages(messages) {
  const container = $('#messages');
  container.innerHTML = '';
  messages.forEach(m => appendMessageEl(m));
  scrollToBottom();
}

function appendMessageEl(msg) {
  const container = $('#messages');
  const div = document.createElement('div');
  div.className = 'message ' + msg.role;
  div.dataset.id = msg.id;

  const avatar = msg.role === 'user' ? 'A' : 'C';
  const htmlContent = msg.format === 'html' ? msg.content : markdownToHtml(msg.content);

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">${htmlContent}</div>
  `;

  // Add actions
  const actions = document.createElement('div');
  actions.className = 'message-actions';
  actions.innerHTML = `
    <button class="msg-btn" onclick="copyText(atob('${btoa(msg.content)}'))">${ICONS.copy} Copy</button>
    <button class="msg-btn" onclick="retryMessage('${msg.id}')">${ICONS.refresh} Retry</button>
    <button class="msg-btn" onclick="deleteMessage('${msg.id}')">${ICONS.trash} Delete</button>
  `;
  div.querySelector('.message-content').appendChild(actions);

  container.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  const container = $('.chat-container');
  if (container) container.scrollTop = container.scrollHeight;
}

function initEventListeners() {
  // Sidebar toggle
  $('#sidebar-toggle')?.addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  // New chat
  $('#new-chat-btn')?.addEventListener('click', createChat);

  // Send
  $('#send-btn')?.addEventListener('click', sendMessage);

  // Input
  const input = $('#chat-input');
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input?.addEventListener('input', () => autoResizeTextarea(input));

  // Plus menu
  $('#plus-btn')?.addEventListener('click', () => {
    $('#plus-menu').classList.remove('hidden');
  });

  // Close modals
  $('.modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.target.classList.add('hidden');
    }
  });

  // Plus items
  $$('.plus-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      handlePlusAction(action);
      $('#plus-menu').classList.add('hidden');
    });
  });

  // Capability chips
  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tool = chip.dataset.tool;
      toggleChip(tool);
    });
  });

  // Suggestions
  $$('.suggestion, .cap-card').forEach(el => {
    el.addEventListener('click', () => {
      const prompt = el.dataset.prompt;
      if (prompt) {
        $('#chat-input').value = prompt;
        autoResizeTextarea($('#chat-input'));
        sendMessage();
      }
    });
  });

  // Model selector
  $('#model-selector')?.addEventListener('click', () => {
    $('#model-modal').classList.remove('hidden');
  });

  $('#close-model')?.addEventListener('click', () => {
    $('#model-modal').classList.add('hidden');
  });

  // Model search
  $('#model-search')?.addEventListener('input', debounce((e) => {
    renderModelList(e.target.value);
  }, 200));

  // Settings
  $('#settings-btn')?.addEventListener('click', () => {
    $('#settings-modal').classList.remove('hidden');
  });

  $('#close-settings')?.addEventListener('click', () => {
    $('#settings-modal').classList.add('hidden');
  });
}

function toggleChip(tool, forceState = null) {
  const chip = $(`.chip[data-tool="${tool}"]`);
  if (!chip) return;

  const isActive = forceState !== null ? !forceState : chip.classList.contains('active');

  if (isActive) {
    chip.classList.remove('active');
  } else {
    chip.classList.add('active');
  }

  const active = $$('.chip.active').map(c => c.dataset.tool);
  saveStorage('activeTools', active);
}

function handlePlusAction(action) {
  const input = $('#chat-input');
  switch(action) {
    case 'image':
      showToast('Image upload coming soon');
      break;
    case 'search':
      toggleChip('search');
      break;
    case 'think':
      toggleChip('think');
      break;
    case 'deep-research':
      toggleChip('agent');
      input.value = '[Deep Research] ' + input.value;
      break;
    case 'python':
      toggleChip('python');
      break;
    case 'terminal':
      toggleChip('terminal');
      break;
    case 'agent':
      toggleChip('agent');
      break;
    case 'canvas':
      toggleChip('canvas');
      break;
    case 'files':
      showToast('File manager coming soon');
      break;
  }
}

function renderModelList(filter = '') {
  const list = $('#model-list');
  if (!list) return;

  const f = filter.toLowerCase();
  const filtered = MODELS.filter(m => 
    m.name.toLowerCase().includes(f) || 
    m.provider.toLowerCase().includes(f)
  );

  const grouped = filtered.reduce((acc, m) => {
    acc[m.provider] = acc[m.provider] || [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  list.innerHTML = Object.entries(grouped).map(([provider, models]) => `
    <div class="model-group">
      <div class="model-group-label">${escapeHtml(provider)}</div>
      ${models.map(m => `
        <div class="model-item ${m.id === settings.model ? 'selected' : ''}" data-model="${m.id}">
          <div class="model-item-icon">${m.provider[0]}</div>
          <div class="model-item-info">
            <div class="model-item-name">${escapeHtml(m.name)} ${m.free ? '<span style="color:var(--success);font-size:11px">FREE</span>' : ''}</div>
            <div class="model-item-desc">${escapeHtml(m.desc)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  $$('.model-item').forEach(el => {
    el.addEventListener('click', () => {
      const modelId = el.dataset.model;
      settings.model = modelId;
      saveStorage('settings', settings);
      $('#current-model').textContent = MODELS.find(m => m.id === modelId)?.name || modelId;
      $('#settings-model').value = modelId;
      $('#model-modal').classList.add('hidden');
      showToast('Model updated');
    });
  });
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const root = document.documentElement;

  if (theme === 'midnight') {
    root.style.setProperty('--bg-primary', '#02040a');
    root.style.setProperty('--bg-secondary', '#0a0f1a');
    root.style.setProperty('--bg-tertiary', '#111827');
  } else if (theme === 'ocean') {
    root.style.setProperty('--bg-primary', '#0a1628');
    root.style.setProperty('--bg-secondary', '#0f1d35');
    root.style.setProperty('--bg-tertiary', '#162744');
    root.style.setProperty('--accent', '#0ea5e9');
    root.style.setProperty('--accent-light', '#38bdf8');
    root.style.setProperty('--accent-glow', 'rgba(14, 165, 233, 0.3)');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #0ea5e9, #38bdf8)');
  } else {
    // Dark default
    root.style.setProperty('--bg-primary', '#0a0a0f');
    root.style.setProperty('--bg-secondary', '#111118');
    root.style.setProperty('--bg-tertiary', '#1a1a24');
    root.style.setProperty('--accent', '#7c3aed');
    root.style.setProperty('--accent-light', '#a78bfa');
    root.style.setProperty('--accent-glow', 'rgba(124, 58, 237, 0.3)');
    root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #7c3aed, #c084fc)');
  }
}

function initSettings() {
  const s = settings;
  const modelSel = $('#settings-model');
  if (modelSel) modelSel.value = s.model;

  const temp = $('#settings-temp');
  if (temp) {
    temp.value = s.temperature;
    $('#temp-val').textContent = s.temperature;
    temp.addEventListener('input', (e) => {
      s.temperature = parseFloat(e.target.value);
      $('#temp-val').textContent = s.temperature;
      saveStorage('settings', s);
    });
  }

  const tokens = $('#settings-tokens');
  if (tokens) {
    tokens.value = s.maxTokens;
    $('#tokens-val').textContent = s.maxTokens;
    tokens.addEventListener('input', (e) => {
      s.maxTokens = parseInt(e.target.value);
      $('#tokens-val').textContent = s.maxTokens;
      saveStorage('settings', s);
    });
  }

  const sysPrompt = $('#settings-system');
  if (sysPrompt) {
    sysPrompt.value = s.systemPrompt || '';
    sysPrompt.addEventListener('input', debounce((e) => {
      s.systemPrompt = e.target.value;
      saveStorage('settings', s);
    }, 500));
  }

  const key = $('#settings-key');
  if (key) {
    key.value = s.apiKey || '';
    key.addEventListener('input', debounce((e) => {
      s.apiKey = e.target.value;
      saveStorage('settings', s);
    }, 500));
  }

  // Theme buttons
  $$('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      s.theme = btn.dataset.theme;
      applyTheme(s.theme);
      saveStorage('settings', s);
    });
  });

  // Auto toggle
  const autoToggle = $('#toggle-auto');
  if (autoToggle) {
    autoToggle.textContent = s.autoMode ? 'On' : 'Off';
    autoToggle.classList.toggle('active', s.autoMode);
    autoToggle.addEventListener('click', () => {
      s.autoMode = !s.autoMode;
      autoToggle.textContent = s.autoMode ? 'On' : 'Off';
      autoToggle.classList.toggle('active', s.autoMode);
      saveStorage('settings', s);
    });
  }

  // Export/Import
  $('#export-btn')?.addEventListener('click', exportChats);
  $('#import-btn')?.addEventListener('click', () => $('#import-file')?.click());
  $('#import-file')?.addEventListener('change', importChats);
}

function exportChats() {
  const data = JSON.stringify(chats, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clipher-chats-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chats exported');
}

function importChats(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        chats = data;
        saveStorage('chats', chats);
        renderChatList();
        showToast('Chats imported');
      }
    } catch(err) {
      showToast('Invalid file');
    }
  };
  reader.readAsText(file);
}

function deleteMessage(msgId) {
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;
  chat.messages = chat.messages.filter(m => m.id !== msgId);
  saveStorage('chats', chats);
  renderMessages(chat.messages);
}

function retryMessage(msgId) {
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;
  const idx = chat.messages.findIndex(m => m.id === msgId);
  if (idx <= 0) return;

  // Find the user message before this assistant message
  let userIdx = idx - 1;
  while (userIdx >= 0 && chat.messages[userIdx].role !== 'user') userIdx--;
  if (userIdx < 0) return;

  const userMsg = chat.messages[userIdx];
  // Remove this and subsequent messages
  chat.messages = chat.messages.slice(0, userIdx);
  saveStorage('chats', chats);
  renderMessages(chat.messages);

  // Resend
  $('#chat-input').value = userMsg.content;
  sendMessage();
}
