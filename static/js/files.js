/* Files */
let currentPath = '.';

async function openFileManager(path = '.') {
  const res = await apiListDir(path);
  const data = res.result || {};

  let content = `**Files in ${escapeHtml(data.path || path)}**\n\n`;

  if (data.items) {
    content += '| Name | Type | Size | Modified |\n';
    content += '|------|------|------|----------|\n';
    data.items.forEach(item => {
      const size = item.size !== null ? formatBytes(item.size) : '-';
      content += `| ${item.name} | ${item.type} | ${size} | ${item.modified} |\n`;
    });
  }

  addMessage(currentChatId, 'assistant', content);
  renderMessages(chats.find(c => c.id === currentChatId).messages);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function readFileToChat(path) {
  const res = await apiReadFile(path);
  const data = res.result || {};

  if (data.error) {
    addMessage(currentChatId, 'assistant', `[Error] ${data.error}`);
  } else {
    const ext = path.split('.').pop();
    const content = `**${escapeHtml(path)}** (${formatBytes(data.size || 0)})\n\n\`\`\`${ext}\n${data.content}\n\`\`\``;
    addMessage(currentChatId, 'assistant', content);
  }
  renderMessages(chats.find(c => c.id === currentChatId).messages);
}
