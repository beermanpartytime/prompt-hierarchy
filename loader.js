// Self-contained extension module
(function() {
    const MODULE_NAME = 'prompt-hierarchy';
    
    class PromptHierarchyManager {
        constructor() {
            this.retryAttempts = 0;
            this.maxRetries = 5;
            this.retryDelay = 1000;
            this.initialized = false;
            this.styleContent = `
                .prompt-handle { cursor: move; padding: 5px; }
                .prompt-ghost { opacity: 0.5; }
                .prompt-dragging { background: #eee; }
                .nested-prompt { margin-left: 20px; }
                .prompt-group { padding-left: 10px; }
                .extension-error { color: red; padding: 10px; }
            `;
        }

        async waitForDependencies() {
            return new Promise((resolve) => {
                const check = () => {
                    // Check for required globals and DOM readiness
                    if (
                        window.jQuery &&
                        document.readyState === 'complete' &&
                        typeof Sortable !== 'undefined' &&
                        document.getElementById('extensions_settings')
                    ) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = this.styleContent;
            document.head.appendChild(style);
        }

        async initializeSettings() {
            return new Promise((resolve) => {
                const checkSettings = () => {
                    if (window.extension_settings) {
                        window.extension_settings[MODULE_NAME] = {
                            enabled: false,
                            autoCollapse: false,
                            nestingBehavior: 'drag',
                            promptHierarchy: {},
                            ...window.extension_settings[MODULE_NAME]
                        };
                        resolve();
                    } else {
                        setTimeout(checkSettings, 100);
                    }
                };
                checkSettings();
            });
        }

        createUI() {
            const container = document.getElementById('extensions_settings');
            if (!container) {
                console.warn(`[${MODULE_NAME}] Extensions settings container not found`);
                return;
            }

            const div = document.createElement('div');
            div.className = 'extension_container';
            div.innerHTML = `
                <div class="extension_header">
                    <b>Prompt Hierarchy</b>
                    <div class="extension_header_icon fa-solid fa-circle-chevron-down"></div>
                </div>
                <div class="extension_content">
                    <label class="checkbox_label">
                        <input type="checkbox" id="${MODULE_NAME}_enabled">
                        <span>Enable Prompt Hierarchy</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="${MODULE_NAME}_autocollapse">
                        <span>Auto-collapse nested prompts</span>
                    </label>
                    <label>
                        <span>Nesting Behavior</span>
                        <select id="${MODULE_NAME}_nesting">
                            <option value="drag">Drag to nest</option>
                            <option value="indent">Indent to nest</option>
                        </select>
                    </label>
                </div>
            `;

            container.appendChild(div);
            this.bindUIEvents();
        }

        bindUIEvents() {
            const settings = window.extension_settings[MODULE_NAME];
            
            // Safe event binding with existence checks
            const enabledCheckbox = document.getElementById(`${MODULE_NAME}_enabled`);
            const autocollapseCheckbox = document.getElementById(`${MODULE_NAME}_autocollapse`);
            const nestingSelect = document.getElementById(`${MODULE_NAME}_nesting`);

            if (enabledCheckbox) {
                enabledCheckbox.checked = settings.enabled;
                enabledCheckbox.addEventListener('change', (e) => {
                    settings.enabled = e.target.checked;
                    this.handleSettingChange();
                });
            }

            if (autocollapseCheckbox) {
                autocollapseCheckbox.checked = settings.autoCollapse;
                autocollapseCheckbox.addEventListener('change', (e) => {
                    settings.autoCollapse = e.target.checked;
                    this.handleSettingChange();
                });
            }

            if (nestingSelect) {
                nestingSelect.value = settings.nestingBehavior;
                nestingSelect.addEventListener('change', (e) => {
                    settings.nestingBehavior = e.target.value;
                    this.handleSettingChange();
                });
            }
        }

        handleSettingChange() {
            // Debounce settings save
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                try {
                    if (typeof saveSettingsDebounced === 'function') {
                        saveSettingsDebounced();
                    }
                } catch (error) {
                    console.warn(`[${MODULE_NAME}] Could not save settings:`, error);
                }
            }, 1000);
        }

        initializeSortable() {
            const container = document.getElementById('prompt_manager_list');
            if (!container) return;

            try {
                if (this.sortableInstance) {
                    this.sortableInstance.destroy();
                }

                this.sortableInstance = new Sortable(container, {
                    group: 'prompts',
                    animation: 150,
                    handle: '.prompt-handle',
                    ghostClass: 'prompt-ghost',
                    dragClass: 'prompt-dragging',
                    onEnd: () => this.updateHierarchy()
                });

                this.addHandlesToPrompts();
            } catch (error) {
                console.error(`[${MODULE_NAME}] Sortable initialization failed:`, error);
            }
        }

        addHandlesToPrompts() {
            const prompts = document.querySelectorAll('.prompt_entry');
            prompts.forEach(prompt => {
                if (!prompt.querySelector('.prompt-handle')) {
                    const handle = document.createElement('div');
                    handle.className = 'prompt-handle';
                    handle.textContent = '☰';
                    prompt.insertBefore(handle, prompt.firstChild);
                }
            });
        }

        updateHierarchy() {
            const container = document.getElementById('prompt_manager_list');
            if (!container) return;

            const hierarchy = Array.from(container.children).map(el => ({
                id: el.dataset.id,
                enabled: el.querySelector('input[type="checkbox"]')?.checked ?? true,
                children: []
            }));

            window.extension_settings[MODULE_NAME].promptHierarchy = hierarchy;
            this.handleSettingChange();
        }

        async init() {
            try {
                await this.waitForDependencies();
                await this.initializeSettings();
                this.injectStyles();
                this.createUI();
                
                if (window.extension_settings[MODULE_NAME].enabled) {
                    this.initializeSortable();
                }

                this.initialized = true;
                console.log(`[${MODULE_NAME}] Initialized successfully`);
            } catch (error) {
                console.error(`[${MODULE_NAME}] Initialization failed:`, error);
                if (this.retryAttempts < this.maxRetries) {
                    this.retryAttempts++;
                    setTimeout(() => this.init(), this.retryDelay);
                }
            }
        }

        cleanup() {
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
                this.sortableInstance = null;
            }
            document.querySelectorAll('.prompt-handle').forEach(handle => handle.remove());
        }
    }

    // Create global instance
    window.promptHierarchy = new PromptHierarchyManager();

    // Register extension when everything is ready
    const register = () => {
        try {
            if (typeof registerExtension === 'function') {
                registerExtension(MODULE_NAME, {
                    name: 'Prompt Hierarchy',
                    init: () => window.promptHierarchy.init(),
                    onEnable: () => window.promptHierarchy.initializeSortable(),
                    onDisable: () => window.promptHierarchy.cleanup(),
                });
            } else {
                setTimeout(register, 1000);
            }
        } catch (error) {
            console.error(`[${MODULE_NAME}] Registration failed:`, error);
            setTimeout(register, 1000);
        }
    };

    // Start registration process when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', register);
    } else {
        register();
    }
})();