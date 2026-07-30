/* Python */
let pythonHistory = [];

function initPython() {
  // Python execution is integrated into chat
}

function renderPythonOutput(data) {
  if (data.error) {
    return `<pre><code style="color:var(--error)">${escapeHtml(data.error)}</code></pre>`;
  }
  return `<pre><code>${escapeHtml(data.output || 'No output')}</code></pre>`;
}
