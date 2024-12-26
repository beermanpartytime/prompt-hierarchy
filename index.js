// index.js

import { loadSettings, defaultSettings } from './utils/load.js';
import { Logger } from './utils/logger.js';
import { EventEmitter } from './utils/eventEmitter.js';
import { DOMManager } from './utils/domManager.js';
import { HierarchyManager } from './utils/hierarchyManager.js';
import './utils/promptmanager.js';
import { debounce, sanitizeForSelector } from './utils/utilities.js';

class PromptHierarchyExtension {
    constructor() {
        this.MODULE_NAME = 'prompt-hierarchy';
        this.sanitizedModuleName = sanitizeForSelector(this.MODULE_NAME);

        // 1. Initialize Logger FIRST
        this.logger = new Logger(this.MODULE_NAME);

        this.eventEmitter = new EventEmitter();

        // Extension settings
        this.defaultSettings = defaultSettings;
        this.settings = loadSettings();

        // 2. Bind Methods - Bind *all* methods that use 'this'
        this.init = this.init.bind(this);
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.getActiveCharacterId = this.getActiveCharacterId.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.saveSettingsDebounced = debounce(this.saveSettings, 2000); // Already bound in debounce
        this.setupSettingsListeners = this.setupSettingsListeners.bind(this);
        this.cleanup = this.cleanup.bind(this);

        // 3. Core Managers - Pass dependencies
        this.domManager = new DOMManager(this);
        this.hierarchyManager = new HierarchyManager(this);

        this.sortableInstance = null;
        this.observer = null;
    }

    async init() {
        this.logger.debug("PromptHierarchyExtension - init, 'this' is:", this);
        this.logger.debug("PromptHierarchyExtension - init, 'this.logger' is:", this.logger);
        this.logger.trace('init', true); // Entering
  
        // Wrap the main logic in an arrow function to capture 'this'
        const initInternal = async () => {
            try {
                await this.cleanup();
                await this.domManager.createSettingsUI();
                this.initializeSettings();
  
                if (this.settings.enabled) {
                    await this.enable();
                }
  
                this.logger.info('Prompt Hierarchy Extension initialized.');
            } catch (error) {
                this.logger.error('Initialization failed:', error);
            }
        };
  
        await initInternal(); // Call the arrow function
        this.logger.trace('init', false); // Exiting
    }

    async enable() {
        this.logger.trace('enable', true); // Start trace
    
        try {
            const container = await this.domManager.waitForElement('#completion_prompt_manager_list');
            if (!container) {
                throw new Error('Prompt list container not found.');
            }
    
            this.domManager.disableSillyTavernDragDrop();
    
            // 4. Initialize hierarchyManager - Ensure 'this' is correct here
            await this.hierarchyManager.initialize();
            this.domManager.initializeSortable(container);
            this.domManager.setupObserver();
    
            this.logger.info('Prompt Hierarchy enabled.');
        } catch (error) {
            this.logger.error('Failed to enable Prompt Hierarchy:', error); // Removed this.logger.getStackTrace()
            this.cleanup();
        }
    this.logger.trace('enable', false); // End trace
    }

    disable() {
        this.logger.trace('disable', true); // Entering

        try {
            this.domManager.cleanup();
            this.hierarchyManager.cleanup();
            this.logger.info('Prompt Hierarchy disabled.');
        } catch (error) {
            this.logger.error('Failed to disable Prompt Hierarchy:', error);
        }

        this.logger.trace('disable', false); // Exiting
    }

    initializeSettings() {
        this.domManager.updateSettingsUI(this.settings);
        this.setupSettingsListeners();
    }

    setupSettingsListeners() {
        const settingsElements = document.querySelectorAll(`[id^="${this.sanitizedModuleName}_"]`);
        settingsElements.forEach(element => {
            const settingKey = element.id.replace(`${this.MODULE_NAME}_`, '');

            element.addEventListener('change', (event) => {
                const value = element.type === 'checkbox' ? event.target.checked : event.target.value;
                this.settings[settingKey] = value;

                if (settingKey === 'enabled') {
                    value ? this.enable() : this.disable();
                }

                this.saveSettings();
                this.logger.info(`Setting "${settingKey}" updated to:`, value);
            });
        });
    }

    async saveSettings() {
        try {
            window.extensions_settings[this.MODULE_NAME] = this.settings;
            if (typeof saveSettingsDebounced === 'function') {
                saveSettingsDebounced();
            }
            this.logger.info('Settings saved.');
        } catch (error) {
            this.logger.error('Failed to save settings:', error);
        }
    }

    async cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            this.logger.info('Observer disconnected.');
        }

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
            this.logger.info('Sortable instance destroyed.');
        }

        this.domManager.cleanup();
        this.hierarchyManager.cleanup();
        this.logger.info('Extension cleaned up.');
    }

    getActiveCharacterId() {
        this.logger.trace('getActiveCharacterId', true);
        this.logger.debug("PromptHierarchyExtension - getActiveCharacterId called, 'this' is:", this);
        this.logger.debug("PromptHierarchyExtension - getActiveCharacterId, 'this.logger' is:", this.logger);
        const context = window.SillyTavern.getContext();
        
        // Use arrow function to ensure 'this' is correct
        const getActiveCharId = function() {
            if (!context || !context.character || typeof context.character.getActiveCharacterId !== 'function') {
                this.logger.warn('Could not access SillyTavern\'s getActiveCharacterId function.');
                return null;
            }        

            try {
                return context.character.getActiveCharacterId();
            } catch (error) {
                this.logger.error('Error getting active character ID:', error);
                return null;
            }
        }.bind(this);

        this.logger.trace('getActiveCharacterId', false); // Exiting
        return getActiveCharId();
    }
}

// Initialize the extension
function initializeExtension() {
    try {
        window.promptHierarchyExtension = new PromptHierarchyExtension();
        window.promptHierarchyExtension.init();
    } catch (error) {
        console.error('Failed to initialize Prompt Hierarchy Extension:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}
