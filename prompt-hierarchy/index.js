// Core imports
import { saveSettingsDebounced } from '../../../script.js';
import { MessageCollection } from '../../../scripts/openai.js';
import { extension_settings, getContext, ModuleWorkerWrapper, modules } from '../../../scripts/extensions.js';

// UI imports
import { Sortable } from '../../../lib/Sortable.esm.js';

// Local imports 
import { loadSettings, defaultSettings } from './utils/load.js';
import { EventEmitter } from './utils/eventEmitter.js';
import { DOMManager } from './utils/domManager.js';
import { HierarchyManager } from './utils/hierarchyManager.js';
import { Logger } from './utils/logger.js';

// Constants
const MODULE_NAME = 'prompt-hierarchy';
const REQUIRED_MODULES = ['settings', 'extensions'];
const event_types = {
    PROMPT_MANAGER_READY: 'PROMPT_MANAGER_READY',
    UNLOAD: 'UNLOAD'
};

class PromptHierarchyExtension {
    constructor() {
        // Core setup
        this.MODULE_NAME = MODULE_NAME;
        this.logger = new Logger(MODULE_NAME);
        this.settings = loadSettings();
        
        // Event system
        this.events = new EventEmitter();
        this.events.enableDebug();

        // State tracking
        this.state = {
            initialized: false,
            enabled: false,
            error: null,
            uiPositions: {},
            promptManager: null
        };

        // Bind methods
        this.init = this.init.bind(this);
        this.enable = this.enable.bind(this);
        this.disable = this.disable.bind(this);
        this.handlePromptManagerInit = this.handlePromptManagerInit.bind(this);
        this.setupPromptManagerHandlers = this.setupPromptManagerHandlers.bind(this);
        
        // Error handling
        this.events.on('error', this.handleError.bind(this));

        this.logger.debug('Extension constructed');
    }

    handleError(error) {
        this.state.error = error;
        this.logger.error('Error:', error);
    }

    async checkRequiredModules() {
        this.logger.debug('Checking required modules...');
        
        // Keep checking until modules are available or timeout
        const MAX_RETRIES = 30;
        let retries = 0;
        
        while (retries < MAX_RETRIES) {
            const missingModules = REQUIRED_MODULES.filter(module => !modules.includes(module));
            
            if (missingModules.length === 0) {
                this.logger.debug('All required modules found');
                return true;
            }
    
            this.logger.debug(`Missing modules: ${missingModules.join(', ')}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries++;
        }
    
        throw new Error(`Required modules not found after ${MAX_RETRIES} seconds: ${REQUIRED_MODULES.join(', ')}`);
    }

    async init() {
        this.logger.debug('Initialization started');

        try {
            // Check required modules
            await this.checkRequiredModules();

            // Initialize settings
            if (!extension_settings[MODULE_NAME]) {
                extension_settings[MODULE_NAME] = defaultSettings;
                await saveSettingsDebounced();
            }

            // Wait for ST core
            await this.waitForSillyTavernCore();

            // Initialize managers
            this.domManager = new DOMManager(this);
            this.hierarchyManager = new HierarchyManager(this);

            await Promise.all([
                this.domManager.init(),
                this.hierarchyManager.init()
            ]);

            // Set up event listeners
            this.setupEventListeners();

            // Enable extension
            await this.enable();

            this.state.initialized = true;
            this.logger.debug('Initialization complete');
            return true;

        } catch (error) {
            this.logger.error('Initialization failed:', error);
            this.state.error = error;
            return false;
        }
    }

    async waitForSillyTavernCore(timeout = 30000) {
        this.logger.debug('Waiting for ST core...');
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('ST core timeout'));
            }, timeout);

            const checkCore = () => {
                if (window.SillyTavern?.getContext?.()) {
                    clearTimeout(timeoutId);
                    this.logger.debug('ST core ready');
                    resolve();
                } else {
                    setTimeout(checkCore, 100);
                }
            };

            checkCore();
        });
    }

    setupEventListeners() {
        // ST core events
        eventSource.on(event_types.PROMPT_MANAGER_READY, this.handlePromptManagerInit);
        eventSource.on(event_types.UNLOAD, this.disable);
    }

    async enable() {
        if (!this.state.initialized) {
            throw new Error('Cannot enable: Not initialized');
        }
        
        this.state.enabled = true;
        this.logger.debug('Extension enabled');
    }

    async disable() {
        if (this.state.enabled) {
            await this.domManager?.cleanup();
            await this.hierarchyManager?.cleanup();
            
            this.state.enabled = false;
            this.logger.debug('Extension disabled');
        }
    }

    handlePromptManagerInit(promptManager) {
        this.logger.debug('Prompt manager initialization');
        this.state.promptManager = promptManager;
        this.setupPromptManagerHandlers(promptManager);
    }

    setupPromptManagerHandlers(promptManager) {
        if (!promptManager) return;

        promptManager.messages = promptManager.messages || new MessageCollection();

        promptManager.handleDrop = (evt) => {
            const draggedId = evt.dataTransfer.getData('text');
            const targetId = evt.target.closest('.completion_prompt_manager_prompt')?.dataset.pmIdentifier;
            
            if (draggedId && targetId) {
                this.hierarchyManager.createGroup(draggedId, targetId);
            }
        };

        this.logger.debug('Prompt manager handlers configured');
    }
}

// Create extension instance
const extension = {
    name: MODULE_NAME,
    settings: defaultSettings,
    init: async function() {
        console.log(`[${MODULE_NAME}] Extension wrapper init`);
        
        try {
            // Wait for ST to fully initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!extension_settings[MODULE_NAME]) {
                extension_settings[MODULE_NAME] = defaultSettings;
            }
            
            const instance = new PromptHierarchyExtension();
            const success = await instance.init();
            
            if (!success) {
                console.warn(`[${MODULE_NAME}] Failed to initialize extension`);
                return false;
            }
            
            // Register cleanup
            eventSource.on(event_types.UNLOAD, () => {
                instance.disable();
            });
            
            console.log(`[${MODULE_NAME}] Successfully initialized`);
            return true;
        } catch (error) {
            console.error(`[${MODULE_NAME}] Extension wrapper failed:`, error);
            return false;
        }
    }
};

export default extension;

// Initialize extension
console.log(`[${MODULE_NAME}] Registering extension`);
new ModuleWorkerWrapper(extension);