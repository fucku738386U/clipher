/* Settings — see ui.js for main settings logic */
// Additional settings helpers

function resetSettings() {
  settings = {
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.9,
    theme: 'dark',
    autoMode: true,
    systemPrompt: ''
  };
  saveStorage('settings', settings);
  applyTheme(settings.theme);
  showToast('Settings reset');
}
