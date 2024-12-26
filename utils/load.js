// utils/load.js

/**
 * @typedef {Object} PromptHierarchySettings
 * @property {boolean} enabled - Indicates whether the Prompt Hierarchy extension is enabled.
 * @property {boolean} autoCollapse - Determines if prompt groups should automatically collapse.
 * @property {number} indentSize - The size of indentation for nested prompts in pixels.
 * @property {number} maxNestingLevel - The maximum allowed level of nesting for prompts.
 * @property {boolean} animations - Whether to enable animations for UI interactions.
 * @property {boolean} showCollapseButtons - Determines if collapse/expand buttons should be displayed.
 * @property {string} theme - The selected theme for the extension's UI.
 * @property {Object} promptHierarchy - The hierarchy data for prompts.
 */

/**
 * @type {PromptHierarchySettings}
 * @description Default settings for the Prompt Hierarchy extension.
 */
const defaultSettings = {
    enabled: true,
    autoCollapse: true,
    indentSize: 20,
    maxNestingLevel: 5,
    animations: true,
    showCollapseButtons: true,
    theme: 'default',
    promptHierarchy: {
        global: { root: [] }
    }
};

/**
 * @description Default placeholder objects for the Prompt Hierarchy extension.
 */

const defaultPlaceholders = {
    examplePrompt1: {
        children: ["examplePrompt4"],
        collapsed: false,
        level: 0
    },
    examplePrompt2: {
        children: [],
        collapsed: false,
        level: 0
    },
    examplePrompt3: {
        children: [],
        collapsed: false,
        level: 0
    },
    examplePrompt4: {
        children: [],
        collapsed: false,
        level: 1
    },
}

/**
 * Loads the settings for the Prompt Hierarchy extension.
 * Merges saved settings with default settings.
 * @returns {PromptHierarchySettings} The loaded settings.
 */
const loadSettings = () => {
    let loadedSettings = { ...defaultSettings };

    if (typeof window !== 'undefined' && window.extensions_settings && window.extensions_settings['prompt-hierarchy']) {
        // Browser environment with saved settings
        loadedSettings = { ...loadedSettings, ...window.extensions_settings['prompt-hierarchy'] };
    }

    return loadedSettings;
};

export { loadSettings, defaultSettings, defaultPlaceholders };
