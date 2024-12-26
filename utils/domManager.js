// utils/domManager.js

import { Logger } from './logger.js';
import { debounce, sanitizeForSelector } from './utilities.js';
import { getContext } from "../../../extensions.js";

const context = getContext();
context.chat; // Chat log
context.characters; // Character list
context.groups; // Group list

class DOMManager {
    /**
     * Creates a new DOMManager instance.
     * @param {PromptHierarchyExtension} extension - The main extension instance.
     */
    constructor(extension) {
        this.extension = extension;
        this.logger = new Logger('DOMManager');
        this.observer = null;
        this.sortableInstance = null;

        this.saveSettingsDebounced = debounce(() => {
            this.extension.saveSettings();
        }, 2000);
    }

    /**
     * Creates the settings UI in the extensions panel.
     */
    async createSettingsUI() {
        const container = document.getElementById('extensions_settings');
        if (!container) {
            this.logger.error('Extensions settings container not found');
            return;
        }

        const extensionDiv = document.createElement('div');
        extensionDiv.id = `${this.extension.sanitizedModuleName}_settings`;
        extensionDiv.classList.add('extension_settings');

        const settingsHTML = `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Prompt Hierarchy</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="prompt-hierarchy-settings">
                        <label class="checkbox_label">
                            <input type="checkbox" id="${this.extension.MODULE_NAME}_enabled" ${this.extension.settings.enabled ? 'checked' : ''}>
                            <span>Enable Prompt Hierarchy</span>
                        </label>

                        <label class="checkbox_label">
                            <input type="checkbox" id="${this.extension.MODULE_NAME}_autoCollapse" ${this.extension.settings.autoCollapse ? 'checked' : ''}>
                            <span>Auto Collapse Groups</span>
                        </label>

                        <div class="prompt-hierarchy-setting-row">
                            <label for="${this.extension.MODULE_NAME}_indentSize">Indent Size</label>
                            <input type="number" id="${this.extension.MODULE_NAME}_indentSize"
                                   value="${this.extension.settings.indentSize}" min="0" max="100">
                        </div>

                        <div class="prompt-hierarchy-setting-row">
                            <label for="${this.extension.MODULE_NAME}_maxNestingLevel">Max Nesting Level</label>
                            <input type="number" id="${this.extension.MODULE_NAME}_maxNestingLevel"
                                   value="${this.extension.settings.maxNestingLevel}" min="1" max="10">
                        </div>

                        <label class="checkbox_label">
                            <input type="checkbox" id="${this.extension.MODULE_NAME}_animations" ${this.extension.settings.animations ? 'checked' : ''}>
                            <span>Enable Animations</span>
                        </label>

                        <label class="checkbox_label">
                            <input type="checkbox" id="${this.extension.MODULE_NAME}_showCollapseButtons" ${this.extension.settings.showCollapseButtons ? 'checked' : ''}>
                            <span>Show Collapse Buttons</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        extensionDiv.innerHTML = settingsHTML;
        container.appendChild(extensionDiv);

        // Setup the listeners through the extension
        this.extension.setupSettingsListeners();
    }

    /**
     * Disables SillyTavern's default drag-and-drop behavior on the prompt list.
     */
    async disableSillyTavernDragDrop() {
        const container = await this.waitForElement('#completion_prompt_manager_list');
        if (container.length) {
            try {
                container.sortable('destroy');
                this.logger.info('SillyTavern\'s default drag and drop disabled.');
            } catch (error) {
                this.logger.error('Failed to disable SillyTavern\'s drag and drop:', error);
            }
        }
    }

    getSettingsHTML() {
        const settingsGroups = [
            {
                title: 'General',
                settings: ['enabled', 'autoCollapse', 'showCollapseButtons']
            },
            {
                title: 'Appearance',
                settings: ['indentSize', 'maxNestingLevel', 'animations', 'theme']
            }
        ];

        return settingsGroups.map(group => `
            <div class="settings-group">
                <div class="settings-group-title">${group.title}</div>
                ${group.settings.map(key => {
                    if (key === 'promptHierarchy') return '';
                    return this.createSettingField(key, this.extension.settings[key]);
                }).join('')}
            </div>
        `).join('');
    }

    getSillyTavernContext() {
        const context = window.SillyTavern.getContext();
        if (!context || !context.prompts) {
            this.logger.warn('SillyTavern context or context.prompts is not available yet.');
            return null;
        }
        return context;
    }

    createSettingField(key, defaultValue) {
        const id = `${this.extension.sanitizedModuleName}_${key}`;
        const label = this.formatSettingLabel(key);
        const settings = this.extension.settings;
        const eventEmitter = this.extension.eventEmitter;
        const self = this;
        const field = document.createElement('div');

        switch (typeof defaultValue) {
            case 'boolean':
                field.innerHTML = `
                    <div class="settings-row">
                        <label class="checkbox_label" for="${id}">
                            <input type="checkbox" id="${id}" ${defaultValue ? 'checked' : ''}>
                            <span>${label}</span>
                        </label>
                    </div>
                `;
                return field.innerHTML;
            case 'number':
                field.innerHTML = `
                    <div class="settings-row">
                        <label for="${id}">${label}</label>
                        <input type="number" id="${id}" value="${defaultValue}" class="text_pole">
                    </div>
                `;

                return field.innerHTML;
            case 'string':
                if (key === 'theme') {
                    field.innerHTML = `
                        <div class="settings-row">
                            <label for="${id}">${label}</label>
                            <select id="${id}" class="text_pole">
                                <option value="default" ${defaultValue === 'default' ? 'selected' : ''}>Default</option>
                                <option value="dark" ${defaultValue === 'dark' ? 'selected' : ''}>Dark</option>
                                <option value="light" ${defaultValue === 'light' ? 'selected' : ''}>Light</option>
                            </select>
                        </div>
                    `;
                    return field.innerHTML;
                }
                field.innerHTML = `
                    <div class="settings-row">
                        <label for="${id}">${label}</label>
                        <input type="text" id="${id}" value="${defaultValue}" class="text_pole">
                    </div>
                `;

                return field.innerHTML;
            default:
                return '';
        }
    }

    formatSettingLabel(key) {
        return key
            .split(/(?=[A-Z])|_/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Adds controls (drag handle, collapse/expand, etc.) to a prompt element.
     * @param {HTMLElement} promptElement - The prompt element to add controls to.
     */
    addPromptControls(promptElement) {
        this.logger.debug("DOMManager - addPromptControls, 'this.extension.hierarchyManager' is:", this.extension.hierarchyManager);
        if (!promptElement || promptElement.querySelector('.prompt-controls')) {
            return; // Controls already added or invalid element
        }

        const controls = document.createElement('div');
        controls.className = 'prompt-controls';

        // Add drag handle (FontAwesome icon)
        const dragHandle = document.createElement('span');
        dragHandle.className = 'prompt-handle completion_prompt_manager_prompt_draggable fa-solid fa-grip-vertical';
        controls.appendChild(dragHandle);

        // Add collapse toggle if enabled
        if (this.extension.settings.showCollapseButtons) {
            const collapseToggle = document.createElement('i');
            collapseToggle.className = 'fas fa-chevron-down prompt-collapse-toggle';
            collapseToggle.addEventListener('click', () => {
                const promptId = this.extension.hierarchyManager.getPromptId(promptElement);
                if (promptId) {
                    this.extension.hierarchyManager.togglePromptCollapse(promptId);
                }
            });
            controls.appendChild(collapseToggle);
        }

        // Existing Buttons - Get prompt data from SillyTavern's context ONLY WHEN NEEDED
        const promptId = this.extension.hierarchyManager.getPromptId(promptElement);
        const context = this.getSillyTavernContext(); // Get context here

        if (promptId && context) { // Check if both promptId and context are valid
            const promptConfig = context.prompts.find(p => p.id === promptId);

            if (promptConfig) {
                // Edit Button
                const editButton = document.createElement('span');
                editButton.innerHTML = '<span class="fa-stack prompt-manager-edit-action"><i class="fa-solid fa-pen-to-square fa-stack-1x"></i></span>';
                editButton.addEventListener('click', () => {
                    if (typeof context.editPrompt === 'function') {
                        context.editPrompt(promptId);
                    } else {
                        this.logger.warn('SillyTavern\'s editPrompt function not found in context.');
                    }
                });
                controls.appendChild(editButton);

                // Toggle Button
                const toggleButton = document.createElement('span');
                toggleButton.innerHTML = `<span class="fa-stack prompt-manager-toggle-action"><i class="fa-solid fa-toggle-${promptConfig.enabled ? 'on' : 'off'} fa-stack-1x"></i></span>`;
                toggleButton.addEventListener('click', () => {
                    if (typeof context.togglePrompt === 'function') {
                        context.togglePrompt(promptId);
                    } else {
                        this.logger.warn('SillyTavern\'s togglePrompt function not found in context.');
                    }
                    toggleButton.innerHTML = `<span class="fa-stack prompt-manager-toggle-action"><i class="fa-solid fa-toggle-${promptConfig.enabled ? 'on' : 'off'} fa-stack-1x"></i></span>`;
                });
                controls.appendChild(toggleButton);
            }
        }

        promptElement.insertBefore(controls, promptElement.firstChild);
    }

    /**
     * Applies styles to a prompt element based on its nesting level and collapsed state.
     * @param {HTMLElement} promptElement - The prompt element to style.
     * @param {string} promptId - The ID of the prompt.
     */
    applyPromptStyles(promptElement, promptId) {
        const hierarchyData = this.extension.hierarchyManager.getPromptData(promptId);
        if (hierarchyData) {
            const indentSize = this.extension.settings.indentSize;
            const nestingDepth = hierarchyData.level * indentSize;
            promptElement.style.setProperty('--nesting-depth', `${nestingDepth}px`);

            if (hierarchyData.collapsed) {
                promptElement.classList.add('collapsed');
            } else {
                promptElement.classList.remove('collapsed');
            }
        }
    }

    /** *   Modifies existing prompts to add controls and apply initial styles.
     *   @param {HTMLElement} container - The prompt list container.
     */
    modifyExistingPrompts(container) {
        const existingPrompts = container.querySelectorAll('.completion_prompt_manager_prompt');
        existingPrompts.forEach(prompt => {
            if (!prompt.querySelector('.prompt-controls')) {
                this.addPromptControls(prompt);
            }
            const promptId = this.extension.hierarchyManager.getPromptId(prompt);
            if (promptId) {
                this.applyPromptStyles(prompt, promptId);
            } else {
                this.logger.warn('Could not process prompt element:', prompt);
            }
        });
    }

    /**
     * Initializes the SortableJS library for drag-and-drop.
     *   @param {HTMLElement} container - The prompt list container.
     */
    async initializeSortable(container) {
        // Ensure container exists
        if (!container) {
            this.logger.error('Prompt list container not found.');
            return;
        }

        // Destroy any existing Sortable instance
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
            this.logger.info('Existing sortable instance destroyed.');
        }

        // Disable SillyTavern's default drag-and-drop
        await this.disableSillyTavernDragDrop();

        // Initialize SortableJS
        this.sortableInstance = new Sortable(container, {
            group: 'prompts',
            animation: this.extension.settings.animations ? 150 : 0,
            handle: '.prompt-handle', // Use the handle for dragging
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            chosenClass: 'sortable-chosen',
            delay: 30, // Prevent accidental drags
            onUpdate: (evt) => {
                // Get the updated order of prompt IDs
                const promptOrder = this.sortableInstance.toArray();

                // Get the active character ID using SillyTavern's context
                const context = window.SillyTavern.getContext();
                const activeCharacterId = context.characterId; // Or however you get it from the context

                // Call hierarchyManager.updateHierarchy() to update the hierarchy internally
                this.extension.hierarchyManager.updateHierarchy(
                    activeCharacterId,
                    promptOrder,
                    evt.oldIndex,
                    evt.newIndex
                );

                // Call hierarchyManager.renderPromptHierarchy() to update the prompt display
                this.extension.hierarchyManager.renderPromptHierarchy();

                // Debounced save settings
                this.extension.saveSettingsDebounced();
            },
        });
        this.logger.info('Sortable initialized.');
    }

    /**
     * Helper method to wait for an element to appear in the DOM.
     * @param {string} selector - The CSS selector for the element.
     * @param {number} [timeout=10000] - The maximum time to wait in milliseconds.
     * @returns {Promise<HTMLElement|null>} The element if found, null otherwise.
     */
    async waitForElement(selector) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }    const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Timeout in case the element is never found
        if (timeout) {
            setTimeout(() => {
                observer.disconnect();
                resolve(null); // Element wasn't found within the timeout
            }, timeout);
        }
    });
    }

    /**
     * Sets up a MutationObserver to watch for changes to the prompt list.
     */
    async setupObserver() {
        // Use waitForElement to ensure the container exists
        const container = await this.waitForElement('#completion_prompt_manager_list');

        if (!container) {
            this.logger.error('Prompt container not found.');
            return;
        }

        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('completion_prompt_manager_prompt')) {
                            this.logger.info('New prompt added, updating hierarchy...');
                            this.addPromptControls(node);
                            this.extension.hierarchyManager.addNewPrompt(node);
                        }
                    });
                }
            });
        });

        this.observer.observe(container, {
            childList: true,
            subtree: false
        });

        this.logger.info('MutationObserver set up.');
    }

    updateSettingsUI(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            const element = document.getElementById(`${this.extension.sanitizedModuleName}_${key}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            this.logger.info('MutationObserver disconnected.');
        }

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
            this.logger.info('Sortable instance destroyed.');
        }

        // Clean up dynamically added elements, styles, etc.
        // Restore the prompt list to its original state
        const promptList = document.getElementById('completion_prompt_manager_list');
        if (promptList) {
            promptList.querySelectorAll('.prompt-controls').forEach(el => el.remove());
            promptList.querySelectorAll('.completion_prompt_manager_prompt').forEach(el => {
                el.classList.remove('promptId-', 'nested-prompt');
                el.style.marginLeft = '';
            });

            // Re-enable SillyTavern's default drag and drop if necessary
            try {
                $(promptList).sortable(); // Assuming SillyTavern uses jQuery sortable
                this.logger.info('SillyTavern\'s default drag and drop re-enabled.');
            } catch (error) {
                this.logger.error('Failed to re-enable SillyTavern\'s drag and drop:', error);
            }
        }
        this.logger.info('Cleaned up DOM.');
    }

}

export { DOMManager };