/* Agent Engine */
let activeAgentTasks = {};

async function runAgent(command) {
  isStreaming = true;
  $('#send-btn').disabled = true;

  const chat = chats.find(c => c.id === currentChatId);

  // Create agent card
  const cardId = 'agent-' + uuid();
  const card = document.createElement('div');
  card.className = 'agent-card';
  card.id = cardId;
  card.innerHTML = `
    <div class="agent-card-header">
      ${ICONS.loader}
      <span>Agent Task</span>
      <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${formatTime()}</span>
    </div>
    <div class="agent-steps">
      <div class="agent-step">
        <div class="step-status running">●</div>
        <span class="step-title">Request received</span>
        <span class="step-time">${formatTime()}</span>
      </div>
      <div class="agent-step">
        <div class="step-status pending">○</div>
        <span class="step-title">AI planning</span>
      </div>
    </div>
  `;

  // Insert after last message or append
  const messages = $('#messages');
  messages.appendChild(card);
  scrollToBottom();

  try {
    // Start agent task
    const res = await apiAgent(command);
    const taskId = res.result?.task_id;

    if (!taskId) {
      throw new Error('Failed to start agent task');
    }

    activeAgentTasks[taskId] = { cardId, command };

    // Poll for status
    await pollAgentStatus(taskId, card);

  } catch(e) {
    card.innerHTML += `<div style="color:var(--error);padding:8px 0">Error: ${escapeHtml(e.message)}</div>`;
    addMessage(currentChatId, 'assistant', '[Agent Error] ' + e.message);
    renderMessages(chat.messages);
  } finally {
    isStreaming = false;
    $('#send-btn').disabled = false;
  }
}

async function pollAgentStatus(taskId, card) {
  const maxAttempts = 120; // 2 minutes max
  const stepsContainer = card.querySelector('.agent-steps');

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));

    try {
      const status = await apiAgentStatus(taskId);

      // Update steps
      if (status.steps && status.steps.length > 0) {
        stepsContainer.innerHTML = status.steps.map((step, idx) => {
          const isDone = step.status === 'done';
          const isRunning = step.status === 'running';
          const statusClass = isDone ? 'done' : isRunning ? 'running' : 'pending';
          const icon = isDone ? '✓' : isRunning ? '●' : '○';
          return `
            <div class="agent-step">
              <div class="step-status ${statusClass}">${icon}</div>
              <span class="step-title">${escapeHtml(step.title)}</span>
              <span class="step-time">${step.time || ''}</span>
            </div>
          `;
        }).join('');
      }

      if (status.status === 'done') {
        // Task complete
        const header = card.querySelector('.agent-card-header');
        header.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style="color:var(--success)">Agent Complete</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${formatTime()}</span>
        `;

        if (status.result) {
          addMessage(currentChatId, 'assistant', status.result);
          renderMessages(chat.messages);
        }

        // Auto-collapse after 3 seconds
        setTimeout(() => {
          card.style.opacity = '0.6';
          stepsContainer.style.display = 'none';
        }, 3000);

        delete activeAgentTasks[taskId];
        return;
      }

      if (status.status === 'error') {
        const header = card.querySelector('.agent-card-header');
        header.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span style="color:var(--error)">Agent Failed</span>
        `;
        addMessage(currentChatId, 'assistant', '[Agent Error] ' + (status.result || 'Unknown error'));
        renderMessages(chat.messages);
        delete activeAgentTasks[taskId];
        return;
      }

    } catch(e) {
      console.error('Poll error:', e);
    }
  }

  // Timeout
  const header = card.querySelector('.agent-card-header');
  header.innerHTML = `<span style="color:var(--warning)">Agent timed out</span>`;
  delete activeAgentTasks[taskId];
}
