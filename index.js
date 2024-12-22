// Prompt Hierarchy Extension
const MODULE_NAME = 'prompt-hierarchy';

// Logger
class Logger {
    static PREFIX = '[Prompt Hierarchy]';
    static LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    
    constructor() {
        this.level = Logger.LEVELS.INFO;
    }

    info(...args) { console.info(Logger.PREFIX, ...args); }
    debug(...args) { console.debug(Logger.PREFIX, ...args); }
    warn(...args) { console.warn(Logger.PREFIX, ...args); }
    error(...args) { console.error(Logger.PREFIX, ...args); }
}

const logger = new Logger();

// Event System
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);
    }

    emit(event, data) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}

const hierarchyEvents = new EventEmitter();

// DOM Manager
class DomManager {
    static getPromptElement(promptId) {
        return document.querySelector(`[data-pm-identifier="${promptId}"]`);
    }

    static createGroupContainer(groupId) {
        const container = document.createElement('div');
        container.className = 'prompt-hierarchy-group';
        container.dataset.groupId = groupId;
        return container;
    }

    static updateNestingVisuals(element, depth) {
        element.style.setProperty('--nesting-depth', depth);
        element.classList.toggle('prompt-slave', depth > 0);
    }

    static updateMovingUI() {
        const promptList = document.getElementById('completion_prompt_manager_list');
        if (!promptList) return;
        const container = promptList.closest('.draggable');
        if (container) {
            document.querySelectorAll('.prompt-hierarchy-group').forEach(group => {
                group.style.width = `${container.offsetWidth - 40}px`;
            });
        }
    }
}

// Hierarchy Management
class PromptHierarchy {
    constructor() {
        this.groups = new Map();
        this.storage = new HierarchyStorage();
        this.tokenManager = new TokenManager();
    }

    createGroup(masterId) {
        const group = {
            id: masterId,
            slaves: new Set(),
            collapsed: false,
            depth: 0
        };
        
        this.groups.set(masterId, group);
        hierarchyEvents.emit('groupCreated', { groupId: masterId });
        return group;
    }

    addToGroup(masterId, slaveId) {
        let group = this.groups.get(masterId) || this.createGroup(masterId);
        this.removeFromGroup(slaveId);
        group.slaves.add(slaveId);
        this.calculateDepths();
        hierarchyEvents.emit('promptGrouped', { groupId: masterId, promptId: slaveId });
    }

    removeFromGroup(promptId) {
        for (const [groupId, group] of this.groups) {
            if (group.slaves.has(promptId)) {
                group.slaves.delete(promptId);
                if (group.slaves.size === 0) {
                    this.groups.delete(groupId);
                }
                return;
            }
        }
    }

    calculateDepths() {
        for (const group of this.groups.values()) {
            group.depth = this.getGroupDepth(group.id);
        }
    }

    getGroupDepth(promptId, visited = new Set()) {
        if (visited.has(promptId)) return 0;
        visited.add(promptId);
        const parentGroup = Array.from(this.groups.values())
            .find(g => g.slaves.has(promptId));
        return parentGroup ? 1 + this.getGroupDepth(parentGroup.id, visited) : 0;
    }
}

// Storage Management
class HierarchyStorage {
    constructor() {
        this.storageKey = MODULE_NAME;
    }

    saveState(state) {
        extension_settings[this.storageKey] = state;
        saveSettingsDebounced();
    }

    loadState() {
        return extension_settings[this.storageKey] || { groups: [] };
    }
}

// Token Management
class TokenManager {
    constructor() {
        this.groupTokens = new Map();
    }

    calculateGroupTokens(groupId, slaves) {
        let total = this.getPromptTokens(groupId);
        for (const slaveId of slaves) {
            total += this.getPromptTokens(slaveId);
        }
        this.groupTokens.set(groupId, total);
        return total;
    }

    getPromptTokens(promptId) {
        const element = DomManager.getPromptElement(promptId);
        return element ? parseInt(element.dataset.pmTokens) || 0 : 0;
    }
}

function initializePromptHierarchy() {
    const promptList = $('#completion_prompt_manager_list');
    
    // Add hierarchy container
    promptList.addClass('hierarchy-enabled');
    
    // Setup drag and drop
    $('.completion_prompt_manager_prompt_draggable').each((i, prompt) => {
        $(prompt).on('dragstart', (e) => {
            e.originalEvent.dataTransfer.setData('text/plain', 
                $(prompt).data('pm-identifier'));
        });
        
        $(prompt).on('dragover', (e) => {
            e.preventDefault();
            const target = $(e.currentTarget);
            target.addClass('hierarchy-drop-target');
        });
        
        $(prompt).on('drop', (e) => {
            e.preventDefault();
            const sourceId = e.originalEvent.dataTransfer.getData('text/plain');
            const targetId = $(e.currentTarget).data('pm-identifier');
            
            if (sourceId !== targetId) {
                createPromptGroup(sourceId, targetId);
            }
        });
    });
}

function createPromptGroup(sourceId, targetId) {
    const source = $(`[data-pm-identifier="${sourceId}"]`);
    const target = $(`[data-pm-identifier="${targetId}"]`);
    
    // Create group wrapper
    const groupWrapper = $('<div/>', {
        class: 'prompt-hierarchy-group',
        'data-group-id': targetId
    });
    
    // Move source under target
    target.wrap(groupWrapper);
    source.insertAfter(target).addClass('prompt-slave');
}

function initializeHierarchyEvents() {
    // Double-click to toggle group
    $('#completion_prompt_manager_list').on('dblclick', '.completion_prompt_manager_prompt', function(e) {
        if ($(e.target).closest('.prompt_manager_prompt_controls').length) return;
        
        const group = $(this).closest('.prompt-hierarchy-group');
        if (group.length) {
            group.toggleClass('collapsed');
            updateTokenDisplay(group);
        }
    });

    // Collapse/Expand All buttons
    $('#collapse_all').on('click', () => {
        $('.prompt-hierarchy-group').addClass('collapsed');
        updateAllTokenDisplays();
    });

    $('#expand_all').on('click', () => {
        $('.prompt-hierarchy-group').removeClass('collapsed');
        updateAllTokenDisplays();
    });

    // Settings changes
    $('#hierarchy_enabled').on('change', function() {
        $('#completion_prompt_manager_list').toggleClass('hierarchy-enabled', this.checked);
    });

    $('#indent_size').on('input', function() {
        const size = $(this).val();
        document.documentElement.style.setProperty('--hierarchy-indent', `${size}px`);
    });

    // Update token displays when prompts change
    const observer = new MutationObserver(() => {
        updateAllTokenDisplays();
    });

    observer.observe(document.getElementById('completion_prompt_manager_list'), {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-pm-tokens']
    });
}

// Initialize Extension
jQuery(async () => {
    if (!window.extension_settings) {
        window.extension_settings = {};
    }
    window.extension_settings[MODULE_NAME] = {};
    
    const hierarchy = new PromptHierarchy();
    
    // Initialize event listeners
    hierarchyEvents.on('groupCreated', ({ groupId }) => {
        const container = DomManager.createGroupContainer(groupId);
        const promptElement = DomManager.getPromptElement(groupId);
        if (promptElement) {
            promptElement.parentNode.insertBefore(container, promptElement);
        }
    });

    // Handle moving UI updates
    document.addEventListener('mousemove', DomManager.updateMovingUI);
    
    logger.info('Prompt Hierarchy initialized');
});
