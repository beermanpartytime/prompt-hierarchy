const MODULE_NAME = 'prompt-hierarchy';

// Default settings
const defaultSettings = {
    enabled: false,
    autoCollapse: false,
    nestingBehavior: 'drag',
    promptHierarchy: {}
};

let settingsReady = false;

// Initialize extension
jQuery(() => {
    try {
        // Register extension
        window['extensions'] = window['extensions'] || {};
        window['extensions'][MODULE_NAME] = {
            name: MODULE_NAME,
            init,
            onEnable,
            onDisable,
        };
        console.log(`[${MODULE_NAME}] Extension registered.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during extension registration:`, error);
    }
});

function init() {
    try {
        // Add settings HTML
        const settingsHtml = `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Prompt Hierarchy</b>
                    <div class="inline-drawer-icon fa-solid interactable down fa-circle-chevron-down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="flex-container">
                        <label>
                            <input id="prompt_hierarchy_enabled" type="checkbox">
                            <span>Enable Prompt Hierarchy</span>
                        </label>
                    </div>
                    <div class="flex-container">
                        <label>
                            <input id="prompt_hierarchy_autocollapse" type="checkbox">
                            <span>Auto-collapse nested prompts</span>
                        </label>
                    </div>
                    <div class="flex-container flexFlowColumn">
                        <label for="prompt_hierarchy_nesting">Nesting Behavior</label>
                        <select class="text_pole" id="prompt_hierarchy_nesting">
                            <option value="drag">Drag to nest</option>
                            <option value="indent">Indent to nest</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        $('#extensions_settings').append(settingsHtml);
        loadSettings();
        setupEventListeners();
        setupPromptManager();
        console.log(`[${MODULE_NAME}] Extension initialized.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during init:`, error);
    }
}

function loadSettings() {
    try {
        // Initialize settings
        window.extension_settings = window.extension_settings || {};
        window.extension_settings[MODULE_NAME] = window.extension_settings[MODULE_NAME] || Object.assign({}, defaultSettings);

        // Set initial values
        $('#prompt_hierarchy_enabled').prop('checked', window.extension_settings[MODULE_NAME].enabled);
        $('#prompt_hierarchy_autocollapse').prop('checked', window.extension_settings[MODULE_NAME].autoCollapse);
        $('#prompt_hierarchy_nesting').val(window.extension_settings[MODULE_NAME].nestingBehavior);
        console.log(`[${MODULE_NAME}] Settings loaded.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during loadSettings:`, error);
    }
}

function setupEventListeners() {
    try {
        // Settings change listeners
        $('#prompt_hierarchy_enabled').on('change', function() {
            window.extension_settings[MODULE_NAME].enabled = $(this).prop('checked');
            if (window.extension_settings[MODULE_NAME].enabled) {
                onEnable();
            } else {
                onDisable();
            }
            saveSettingsDebounced();
        });

        $('#prompt_hierarchy_autocollapse').on('change', function() {
            window.extension_settings[MODULE_NAME].autoCollapse = $(this).prop('checked');
            saveSettingsDebounced();
        });

        $('#prompt_hierarchy_nesting').on('change', function() {
            window.extension_settings[MODULE_NAME].nestingBehavior = $(this).val();
            saveSettingsDebounced();
        });

        // Event handler for settings updates
        eventSource.on(event_types.SETTINGS_UPDATED, (settings) => {
            if (settings.key === MODULE_NAME) {
                const container = document.getElementById('prompt_manager_list');
                if (container) {
                    if (settings.value.enabled) {
                        onEnable();
                    } else {
                        onDisable();
                    }
                }
            }
        });

        // Event handler for settings ready
        eventSource.on(event_types.SETTINGS_READY, () => {
            settingsReady = true;
            console.log(`[${MODULE_NAME}] Settings are ready.`);
        });
        console.log(`[${MODULE_NAME}] Event listeners set up.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during setupEventListeners:`, error);
    }
}

function setupPromptManager() {
    try {
        eventSource.on(event_types.PROMPT_MANAGER_READY, () => {
            const container = document.getElementById('prompt_manager_list');
            if (!container) return;

            if (window.extension_settings[MODULE_NAME].enabled) {
                initializeSortable(container);
                addHandlesToPrompts();
            }
        });
        console.log(`[${MODULE_NAME}] Prompt manager set up.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during setupPromptManager:`, error);
    }
}

function initializeSortable(container) {
    try {
        new Sortable(container, {
            group: 'prompts',
            animation: 150,
            handle: '.prompt-handle',
            ghostClass: 'prompt-ghost',
            dragClass: 'prompt-drag',
            onEnd: () => {
                updateHierarchy();
                if (typeof countTokensDebounced === 'function') {
                    countTokensDebounced();
                }
            }
        });
        console.log(`[${MODULE_NAME}] Sortable initialized.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during initializeSortable:`, error);
    }
}

function addHandlesToPrompts() {
    try {
        $('.prompt_entry').each(function() {
            if (!$(this).find('.prompt-handle').length) {
                $(this).prepend('<div class="prompt-handle">☰</div>');
            }
        });
        console.log(`[${MODULE_NAME}] Handles added to prompts.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during addHandlesToPrompts:`, error);
    }
}

function updateHierarchy() {
    try {
        const container = document.getElementById('prompt_manager_list');
        if (!container) return;

        const hierarchy = Array.from(container.children).map(el => ({
            id: el.dataset.id,
            enabled: el.querySelector('input[type="checkbox"]')?.checked ?? true,
            children: []
        }));

        window.extension_settings[MODULE_NAME].promptHierarchy = hierarchy;
        saveSettingsDebounced();
        console.log(`[${MODULE_NAME}] Hierarchy updated.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during updateHierarchy:`, error);
    }
}

function onEnable() {
    try {
        const container = document.getElementById('prompt_manager_list');
        if (container) {
            addHandlesToPrompts();
            initializeSortable(container);
        }
        console.log(`[${MODULE_NAME}] Extension enabled.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during onEnable:`, error);
    }
}

function onDisable() {
    try {
        const container = document.getElementById('prompt_manager_list');
        $('.prompt-handle').remove();
        if (container?.sortable) {
            container.sortable.destroy();
        }
        console.log(`[${MODULE_NAME}] Extension disabled.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during onDisable:`, error);
    }
}

function saveSettingsDebounced() {
    if (!settingsReady) {
        console.warn(`[${MODULE_NAME}] Settings not ready, aborting save.`);
        return;
    }
    
    console.log(`[${MODULE_NAME}] Saving settings.`);
    
    // Use a debounced save function if available, otherwise save directly
    if (typeof saveExtensionSettingsDebounced === 'function') {
        saveExtensionSettingsDebounced(MODULE_NAME);
    } else {
        saveExtensionSettings(MODULE_NAME);
    }
}
