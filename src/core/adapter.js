// Per-surface contracts. `page` selects CDP targets; `required` parts decide the full/basic level.
// Runtime presence is always checked, so a missing selector only lowers the level.
const dialog = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-modal="true"], .context-view, .monaco-menu-container, .monaco-select-box-dropdown-container, .quick-input-widget';

export const adapters = {
  agent: {
    id: 'trae-cn-agent-v2',
    surface: 'agent',
    page: '/solo/solo-lite.html',
    root: '#root',
    required: ['main', 'composer'],
    parts: {
      sidebar: '.task-list-base, .task-list-base-content, .task-list-base-footer, .task-list-heading, .task-list-group-header-wrapper, .task-list-new-task-item, .taskItem, .soloLiteMenubar, .ai-chat-history-container',
      main: '#solo-lite-root, .panel-container, .panel-container > .panel-content, .solo-lite-chat-panel-container, .solo-lite-chat-panel-main, .solo-lite-chat-panel, .solo-lite-chat-container, .session-panel-cache-layout, .ai-chat-pane-container, .ai-chat-pane-content, .chat-input-v2-container, .chat-input-v2-input-box-wrapper, .chat-input-v2-editor-part',
      composer: '.messageInputContainer',
      thread: '.virtualized-message-list-view, .virtualized-message-list-view__content, .agent-chat-view, .ai-chat-pane-content',
      home: '.initial-chat-panel, .assistant-welcome-container, .ai-chat-pane-welcome',
      dialog
    }
  },
  // IDE window; SOLO mode is a layout of the same page (soloTitlebar / soloaisidebar parts), not a separate target.
  ide: {
    id: 'trae-cn-ide-v1',
    surface: 'ide',
    page: '/workbench/workbench.html',
    root: '.monaco-workbench',
    required: ['editor', 'pane'],
    parts: {
      editor: '.monaco-workbench .part.editor',
      pane: '.monaco-workbench .part.sidebar, .monaco-workbench .part.auxiliarybar, .monaco-workbench .part.panel, .monaco-workbench .part.soloaisidebar',
      chrome: '.monaco-workbench .part.titlebar, .monaco-workbench .part.activitybar, .monaco-workbench .part.statusbar',
      dialog
    }
  }
};
