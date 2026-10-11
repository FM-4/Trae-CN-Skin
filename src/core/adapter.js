// Initial contract from upstream TRAE adaptation; runtime presence is always checked.
export const adapter = {
  id: 'trae-cn-agent-v1',
  root: '#root',
  parts: {
    sidebar: '.task-list-base, .task-list-base-content, .task-list-base-footer, .task-list-heading, .task-list-group-header-wrapper, .task-list-new-task-item, .taskItem, .soloLiteMenubar, .ai-chat-history-container',
    main: '#solo-lite-root, .panel-container, .panel-container > .panel-content, .solo-lite-chat-panel-container, .solo-lite-chat-panel-main, .solo-lite-chat-panel, .solo-lite-chat-container, .session-panel-cache-layout, .ai-chat-pane-container, .ai-chat-pane-content, .chat-input-v2-container, .chat-input-v2-input-box-wrapper, .chat-input-v2-editor-part',
    composer: '.messageInputContainer',
    thread: '.virtualized-message-list-view, .virtualized-message-list-view__content, .agent-chat-view, .ai-chat-pane-content',
    home: '.initial-chat-panel, .assistant-welcome-container, .ai-chat-pane-welcome',
    dialog: '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-modal="true"], .context-view, .monaco-menu-container, .monaco-select-box-dropdown-container, .quick-input-widget'
  }
};
