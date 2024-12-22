import { extension_settings, getContext, saveSettingsDebounced } from "../extensions.js";
import { registerExtension, extension_prompt_types } from "../../extensions.js";

const MODULE_NAME = 'prompt-hierarchy';

// Register extension properly
registerExtension(MODULE_NAME, {
    name: MODULE_NAME,
    init,
    onEnable,
    onDisable,
    settings: defaultSettings,
});

// Default settings
const defaultSettings = {
    enabled: false,
    autoCollapse: false,
    nestingBehavior: 'drag',
    promptHierarchy: {}
};

let sortableInstance = null;

// Initialize extension
jQuery(() => {
    try {
        // Register extension
        registerExtension(MODULE_NAME, {
            name: MODULE_NAME,
            init,
            onEnable,
            onDisable,
            onSettingsChange
        });
        console.log(`[${MODULE_NAME}] Extension registered.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during extension registration:`, error);
    }
});

function initExtensionMenu() {
    try {
        // Add settings HTML
        const settingsHtml = `
            <div class="extension_container">
                <div class="extension_header">
                    <b data-i18n="ext_prompt_hierarchy_title">Prompt Hierarchy</b>
                    <div class="extension_header_icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="extension_content">
                    <div class="flex-container">
                        <label>
                            <input id="prompt_hierarchy_enabled" type="checkbox">
                            <span data-i18n="ext_prompt_hierarchy_enable">Enable Prompt Hierarchy</span>
                        </label>
                    </div>
                    <div class="flex-container">
                        <label>
                            <input id="prompt_hierarchy_autocollapse" type="checkbox">
                            <span data-i18n="ext_prompt_hierarchy_autocollapse">Auto-collapse nested prompts</span>
                        </label>
                    </div>
                    <div class="flex-container flexFlowColumn">
                        <label for="prompt_hierarchy_nesting" data-i18n="ext_prompt_hierarchy_nesting_label">Nesting Behavior</label>
                        <select class="text_pole" id="prompt_hierarchy_nesting">
                            <option value="drag" data-i18n="ext_prompt_hierarchy_nesting_drag">Drag to nest</option>
                            <option value="indent" data-i18n="ext_prompt_hierarchy_nesting_indent">Indent to nest</option>
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
        console.log(`[${MODULE_NAME}] Event listeners set up.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during setupEventListeners:`, error);
    }
}

function setupPromptManager() {
    try {
        const container = document.getElementById('prompt_manager_list');
        if (!container) return;

        if (window.extension_settings[MODULE_NAME].enabled) {
            initializeSortable(container);
            addHandlesToPrompts();
        }
        console.log(`[${MODULE_NAME}] Prompt manager set up.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during setupPromptManager:`, error);
    }
}

function initSortableWithNesting(container) {
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(container, {
        group: 'prompts',
        animation: 150,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        handle: '.prompt-handle',
        dragClass: 'prompt-dragging',
        ghostClass: 'prompt-ghost',
        onEnd: function(evt) {
            const item = evt.item;
            const target = evt.to;
            
            // Handle nesting logic
            if (target.classList.contains('prompt-group')) {
                item.classList.add('nested-prompt');
                updateHierarchy();
            }
        }
    });
}

function initializeSortable(container) {
    try {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        sortableInstance = new Sortable(container, {
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
        
        saveExtensionSettingsDebounced(MODULE_NAME);

    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during updateHierarchy:`, error);
    }
}

function onEnable() {
    transformPromptManagerUI();

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
    const hierarchyContainer = document.getElementById('prompt-hierarchy-container');
    const originalList = document.getElementById('prompt_manager_list'); 

    if (hierarchyContainer && originalList) {
        // Restore original entries
        const originalEntries = Array.from(hierarchyContainer.querySelectorAll('.prompt_entry'));
        originalList.innerHTML = '';
        originalEntries.forEach(entry => originalList.appendChild(entry));
    }

    try {
        const container = document.getElementById('prompt_manager_list');
        $('.prompt-handle').remove();
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
        console.log(`[${MODULE_NAME}] Extension disabled.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during onDisable:`, error);
    }

}

function init() {
    const promptListContainer = document.querySelector('#prompt_list_div');
    if (!promptListContainer) {
        console.warn(`[${MODULE_NAME}] Prompt list container not found`);
        return;
    }

    // Add our custom classes
    promptListContainer.classList.add('hierarchy-enabled');
    
    // Add drag handles to each prompt
    const prompts = promptListContainer.querySelectorAll('.prompt_entry');
    prompts.forEach(prompt => {
        addDragHandleToPrompt(prompt);
    });

    // Initialize sortable with nesting
    initSortableWithNesting(promptListContainer);
}

// Key modification: Direct UI intervention
function transformPromptManagerUI() {
    const promptList = document.getElementById('prompt_manager_list');
    if (!promptList) return;

    // Add a container for hierarchical view
    const hierarchyContainer = document.createElement('div');
    hierarchyContainer.id = 'prompt-hierarchy-container';
    hierarchyContainer.classList.add('prompt-hierarchy-view');

    // Transform existing prompts into a hierarchical structure
    const promptEntries = Array.from(promptList.querySelectorAll('.prompt_entry'));
    
    // Create a root-level container
    const rootGroup = document.createElement('div');
    rootGroup.classList.add('prompt-group', 'root-group');

    promptEntries.forEach(entry => {
        // Add hierarchy-specific elements
        const hierarchyEntry = document.createElement('div');
        hierarchyEntry.classList.add('prompt-hierarchy-entry');
        
        // Add expand/collapse toggle
        const collapseToggle = document.createElement('span');
        collapseToggle.classList.add('prompt-collapse-toggle');
        collapseToggle.textContent = '▶'; // Unicode right-pointing triangle
        collapseToggle.addEventListener('click', () => {
            hierarchyEntry.classList.toggle('collapsed');
            collapseToggle.textContent = hierarchyEntry.classList.contains('collapsed') ? '▶' : '▼';
        });

        // Add drag handle
        const dragHandle = document.createElement('span');
        dragHandle.classList.add('prompt-drag-handle');
        dragHandle.textContent = '☰'; // Unicode list icon

        // Move original entry contents
        hierarchyEntry.appendChild(collapseToggle);
        hierarchyEntry.appendChild(dragHandle);
        hierarchyEntry.appendChild(entry);

        rootGroup.appendChild(hierarchyEntry);
    });

    hierarchyContainer.appendChild(rootGroup);

    // Replace original list
    promptList.innerHTML = '';
    promptList.appendChild(hierarchyContainer);

    // Re-initialize Sortable with new structure
    new Sortable(hierarchyContainer, {
        group: 'prompt-hierarchy',
        handle: '.prompt-drag-handle',
        animation: 150,
        onEnd: updatePromptHierarchy
    });
}

function updatePromptHierarchy() {
    // Logic to update hierarchy based on drag-and-drop
    const hierarchyContainer = document.getElementById('prompt-hierarchy-container');
    if (!hierarchyContainer) return;

    const hierarchy = [];
    const groups = hierarchyContainer.querySelectorAll('.prompt-hierarchy-entry');
    
    groups.forEach(group => {
        const promptEntry = group.querySelector('.prompt_entry');
        if (promptEntry) {
            hierarchy.push({
                id: promptEntry.dataset.id,
                children: [] // Future: implement nested structure
            });
        }
    });

    // Save hierarchy to extension settings
    window.extension_settings[MODULE_NAME].promptHierarchy = hierarchy;
    saveExtensionSettingsDebounced(MODULE_NAME);
}

function onSettingsChange(settings) {
    try {
        if (settings && settings[MODULE_NAME]) {
            const newSettings = settings[MODULE_NAME];
            $('#prompt_hierarchy_enabled').prop('checked', newSettings.enabled);
            $('#prompt_hierarchy_autocollapse').prop('checked', newSettings.autoCollapse);
            $('#prompt_hierarchy_nesting').val(newSettings.nestingBehavior);

            const container = document.getElementById('prompt_manager_list');
            if (container) {
                if (newSettings.enabled) {
                    onEnable();
                } else {
                    onDisable();
                }
            }
            console.log(`[${MODULE_NAME}] Settings changed.`);
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] Error during onSettingsChange:`, error);
    }
}

function addCollapseBehavior() {
    document.querySelectorAll('.prompt-group-header').forEach(header => {
        header.addEventListener('dblclick', (e) => {
            const group = e.target.closest('.prompt-group');
            group.classList.toggle('collapsed');
            e.preventDefault();
        });
    });
}
