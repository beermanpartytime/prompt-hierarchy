const MODULE_NAME = 'prompt-hierarchy';

const defaultSettings = {
    enabled: true,
    autoCollapse: false,
    nestingBehavior: 'drag',
    promptHierarchy: {}
};

// Initialize extension
jQuery(() => {
    // Register extension
    window['extensions'] = window['extensions'] || {};
    window['extensions'][MODULE_NAME] = {
        name: MODULE_NAME,
        init,
        onEnable,
        onDisable,
    };
});

function init() {
    loadSettings();
    setupEventListeners();
    initializePromptManager();
}

function loadSettings() {
    window.extension_settings = window.extension_settings || {};
    window.extension_settings[MODULE_NAME] = window.extension_settings[MODULE_NAME] || {};
    Object.assign(window.extension_settings[MODULE_NAME], defaultSettings);
    
    // Check if renderExtensionTemplate is available before using it
    if (typeof window.renderExtensionTemplate === 'function') {
        $('#extensions_settings').append(window.renderExtensionTemplate(MODULE_NAME, 'settings'));
    } else {
        console.error('renderExtensionTemplate is not available.');
        return;
    }
    
    $('#prompt_hierarchy_enabled').prop('checked', window.extension_settings[MODULE_NAME].enabled);
    $('#prompt_hierarchy_autocollapse').prop('checked', window.extension_settings[MODULE_NAME].autoCollapse);
    $('#prompt_hierarchy_nesting').val(window.extension_settings[MODULE_NAME].nestingBehavior);
}


function setupEventListeners() {
    $('#prompt_hierarchy_enabled').on('change', () => {
        window.extension_settings[MODULE_NAME].enabled = $('#prompt_hierarchy_enabled').prop('checked');
        window.extension_settings[MODULE_NAME].enabled ? onEnable() : onDisable();
        saveSettingsDebounced();
    });

    $('#prompt_hierarchy_autocollapse').on('change', () => {
        window.extension_settings[MODULE_NAME].autoCollapse = $('#prompt_hierarchy_autocollapse').prop('checked');
        saveSettingsDebounced();
    });

    $('#prompt_hierarchy_nesting').on('change', () => {
        window.extension_settings[MODULE_NAME].nestingBehavior = $('#prompt_hierarchy_nesting').val();
        saveSettingsDebounced();
    });
}

function initializePromptManager() {
    eventSource.on(event_types.PROMPT_MANAGER_READY, () => {
        const container = document.getElementById('prompt_manager_list');
        if (!container) return;

        new Sortable(container, {
            group: 'prompts',
            animation: 150,
            handle: '.prompt-handle',
            ghostClass: 'prompt-ghost',
            dragClass: 'prompt-drag',
            onEnd: (evt) => {
                updateHierarchy();
                countTokensDebounced();
            }
        });

        addHandlesToPrompts();
    });
}

function addHandlesToPrompts() {
    $('.prompt_entry').each(function() {
        if (!$(this).find('.prompt-handle').length) {
            $(this).prepend('<div class="prompt-handle">☰</div>');
        }
    });
}

function updateHierarchy() {
    const container = document.getElementById('prompt_manager_list');
    if (!container) return;

    const hierarchy = Array.from(container.children).map(el => ({
        id: el.dataset.id,
        enabled: el.querySelector('input[type="checkbox"]')?.checked ?? true,
        children: []
    }));

    window.extension_settings[MODULE_NAME].promptHierarchy = hierarchy;
    saveSettingsDebounced();
}

function onEnable() {
    const container = document.getElementById('prompt_manager_list');
    if (container) {
        addHandlesToPrompts();
        initializePromptManager();
    }
}

function onDisable() {
    const container = document.getElementById('prompt_manager_list');
    if (container?.sortable) {
        container.sortable.destroy();
    }
    $('.prompt-handle').remove();
}
