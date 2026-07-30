/* Canvas */
let canvasActive = false;
let canvasContent = '';

function initCanvas() {
  // Canvas is toggled via chip
}

function openCanvas(initialContent = '') {
  canvasActive = true;
  canvasContent = initialContent;

  // Hide chat, show canvas
  $('#welcome').style.display = 'none';
  $('#messages').classList.remove('active');

  let container = $('#canvas-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'canvas-container';
    container.className = 'canvas-container';
    container.innerHTML = `
      <div class="canvas-toolbar">
        <button class="active" data-view="split">Split</button>
        <button data-view="edit">Edit</button>
        <button data-view="preview">Preview</button>
        <button data-view="close" style="margin-left:auto">Close</button>
      </div>
      <div class="canvas-split">
        <div class="canvas-editor">
          <div class="canvas-editor-header">Markdown</div>
          <textarea id="canvas-editor" placeholder="Write markdown here..."></textarea>
        </div>
        <div class="canvas-preview">
          <div class="canvas-preview-header">Preview</div>
          <div id="canvas-preview-content" class="canvas-preview-content"></div>
        </div>
      </div>
    `;
    $('.main').insertBefore(container, $('.composer-wrapper'));

    // Setup canvas events
    const editor = $('#canvas-editor');
    editor.addEventListener('input', debounce(() => {
      canvasContent = editor.value;
      updateCanvasPreview();
    }, 300));

    $$('.canvas-toolbar button').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'close') {
          closeCanvas();
          return;
        }

        $$('.canvas-toolbar button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const split = $('.canvas-split');
        const editPanel = $('.canvas-editor');
        const previewPanel = $('.canvas-preview');

        if (view === 'split') {
          split.style.gridTemplateColumns = '1fr 1fr';
          editPanel.style.display = 'flex';
          previewPanel.style.display = 'flex';
        } else if (view === 'edit') {
          split.style.gridTemplateColumns = '1fr';
          editPanel.style.display = 'flex';
          previewPanel.style.display = 'none';
        } else if (view === 'preview') {
          split.style.gridTemplateColumns = '1fr';
          editPanel.style.display = 'none';
          previewPanel.style.display = 'flex';
        }
      });
    });
  }

  container.classList.add('active');
  $('#canvas-editor').value = canvasContent;
  updateCanvasPreview();
}

function closeCanvas() {
  canvasActive = false;
  const container = $('#canvas-container');
  if (container) container.classList.remove('active');

  const chat = chats.find(c => c.id === currentChatId);
  if (chat && chat.messages.length > 0) {
    showMessages();
  } else {
    showWelcome();
  }
}

function updateCanvasPreview() {
  const preview = $('#canvas-preview-content');
  if (preview) {
    preview.innerHTML = markdownToHtml(canvasContent);
  }
}

function sendCanvasToChat() {
  if (!canvasContent.trim()) return;
  addMessage(currentChatId, 'user', '[Canvas]\n\n' + canvasContent);
  closeCanvas();
  sendMessage();
}
