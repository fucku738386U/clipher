/* Terminal */
let terminalHistory = [];

function initTerminal() {
  // Terminal is integrated into chat via tool execution
}

function renderTerminalOutput(data) {
  let html = `<div class="terminal-output">`;
  if (data.cmd) html += `<div class="cmd">$ ${escapeHtml(data.cmd)}</div>`;
  if (data.stdout) html += `<div class="stdout">${escapeHtml(data.stdout)}</div>`;
  if (data.stderr) html += `<div class="stderr">${escapeHtml(data.stderr)}</div>`;
  if (data.error) html += `<div class="stderr">Error: ${escapeHtml(data.error)}</div>`;
  html += `</div>`;
  return html;
}
