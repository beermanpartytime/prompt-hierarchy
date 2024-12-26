// utils/hierarchyManager.js

import { Logger } from './logger.js';

class HierarchyManager {
    constructor(extension) {
        this.extension = extension;
        this.logger = new Logger('HierarchyManager');
        this.container = document.getElementById('completion_prompt_manager_list');
        this.hierarchyData = new Map();

        this.initialize = this.initialize.bind(this);
        this.loadHierarchy = this.loadHierarchy.bind(this);
        this.initializeDefaultHierarchy = this.initializeDefaultHierarchy.bind(this);
        this.calculateNestingLevel = this.calculateNestingLevel.bind(this);
        this.getPromptData = this.getPromptData.bind(this);
        this.findPromptData = this.findPromptData.bind(this);
        this.updateHierarchy = this.updateHierarchy.bind(this);
        this.addNewPrompt = this.addNewPrompt.bind(this);
        this.renderPromptHierarchy = this.renderPromptHierarchy.bind(this);
        this.togglePromptCollapse = this.togglePromptCollapse.bind(this);
        this.saveHierarchy = this.saveHierarchy.bind(this);
        this.serializeHierarchy = this.serializeHierarchy.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }

    getPromptManager() {
        if (!window.promptManager) {
            this.logger.error('SillyTavern\'s promptManager is not available.');
            return null;
        }
        return window.promptManager;
    }

    getPromptId(promptElement) {
        this.logger.trace('getPromptId', true); // Start trace

        // 1. Check if the prompt element is valid
        if (!promptElement) {
            this.logger.error('getPromptId: Invalid prompt element provided.');
            return null;
        }

        // 2. Check if the dataset attribute exists directly
        if (promptElement.dataset && promptElement.dataset.promptId) {
            this.logger.trace('getPromptId', false); // End trace
            return promptElement.dataset.promptId;
        }

        // 3. Fallback: Check for an 'id' attribute (less reliable)
        if (promptElement.id) {
            this.logger.warn('getPromptId: Using potentially unreliable element ID as prompt ID.');
            this.logger.trace('getPromptId', false); // End trace
            return promptElement.id;
        }

        // 4. Handle the case where no ID is found
        this.logger.error('getPromptId: Could not find prompt ID for element:', promptElement);
        this.logger.trace('getPromptId', false); // End trace
        return null;
    }

    async initialize() {
        this.logger.trace('initialize', true);
        this.logger.debug("HierarchyManager - initialize, 'this' is:", this);
        this.logger.debug("HierarchyManager - initialize, 'this.logger' is:", this.logger);
        this.promptManager = this.getPromptManager();

        try {
            this.loadHierarchy();
            this.renderPromptHierarchy();
        } catch (error) {
            this.logger.error('Error in initialize:', error);
        }

        this.logger.trace('initialize', false);
    }

    loadHierarchy() {
        this.logger.trace('loadHierarchy', true); // Start trace
        this.logger.debug("HierarchyManager - loadHierarchy called");
        this.logger.debug("HierarchyManager - loadHierarchy, 'this' is:", this);

        const savedHierarchy = this.extension.settings.promptHierarchy;
        const activeCharacterId = this.extension.getActiveCharacterId();

        this.logger.debug("HierarchyManager - loadHierarchy, activeCharacterId:", activeCharacterId);

        if (savedHierarchy && savedHierarchy[activeCharacterId]) {
            this.hierarchyData.set(activeCharacterId, savedHierarchy[activeCharacterId]);
        } else {
            this.initializeDefaultHierarchy();
        }

        this.logger.trace('loadHierarchy', false); // End trace
    }

    initializeDefaultHierarchy() {
        const activeCharacterId = this.extension.getActiveCharacterId();
        const promptManager = this.getPromptManager();

        if (!promptManager) {
            this.logger.error('Prompt manager is not available. Initialization aborted.');
            return;
        }

        const defaultPrompts = promptManager.getPromptsForCharacter(activeCharacterId);

        const newHierarchy = { 
            root: defaultPrompts.map(prompt => prompt.identifier.toString())
        };
        
        if (defaultPromptOrder && Array.isArray(defaultPromptOrder)) {
            newHierarchy.root = defaultPromptOrder.map(prompt => prompt.identifier.toString());
        } else {
            const allPrompts = promptManager.getPrompts();
            newHierarchy.root = allPrompts.map(prompt => prompt.identifier.toString());
        }

        const defaultPlaceholders = this.extension.defaultSettings.defaultPlaceholders;
        if (defaultPlaceholders) {
            Object.entries(defaultPlaceholders).forEach(([id, data]) => {
                this.hierarchyData.set(id, {
                    ...data,
                    level: this.calculateNestingLevel(id, defaultPlaceholders)
                });
            });
        }

        this.hierarchyData.set(activeCharacterId, newHierarchy);
        this.saveHierarchy();
        this.logger.trace('initializeDefaultHierarchy', false); // End trace
    }

    calculateNestingLevel(id, hierarchy, visited = new Set()) {
        if (visited.has(id)) {
            this.logger.error('Circular reference detected in hierarchy:', id);
            return 0; // Prevent infinite loop in case of circular references
        }
        visited.add(id);

        const parent = Object.entries(hierarchy).find(([_, data]) =>
            data.children && data.children.includes(id)
        );

        return parent ? 1 + this.calculateNestingLevel(parent[0], hierarchy, visited) : 0;
    }

    getPromptData(promptId) {
        const activeCharacterId = this.extension.getActiveCharacterId();
        const characterHierarchy = this.hierarchyData.get(activeCharacterId);
        return this.findPromptData(promptId, characterHierarchy);
    }

    findPromptData(promptId, hierarchy) {
        if (!hierarchy) return null;
        if (hierarchy.root.includes(promptId)) {
            return {
                children: hierarchy[promptId]?.children || [],
                collapsed: hierarchy[promptId]?.collapsed || false,
                level: 0
            };
        }
        for (const key in hierarchy) {
            if (key !== 'root' && hierarchy[key].children) {
                if (hierarchy[key].children.includes(promptId)) {
                    return {
                        children: hierarchy[promptId]?.children || [],
                        collapsed: hierarchy[promptId]?.collapsed || false,
                        level: this.calculateNestingLevel(promptId, this.hierarchyData)
                    };
                }
                const found = this.findPromptData(promptId, hierarchy[key]);
                if (found) return found;
            }
        }
        return null;
    }

    updateHierarchy(activeCharacterId, promptOrder, oldIndex, newIndex) {
        const hierarchy = this.hierarchyData.get(activeCharacterId);
        if (!hierarchy) return;

        const movedPromptId = hierarchy.root.splice(oldIndex, 1)[0];
        hierarchy.root.splice(newIndex, 0, movedPromptId);

        this.hierarchyData.set(activeCharacterId, hierarchy);
        this.saveHierarchy();
    }

    addNewPrompt(promptNode) {
        const promptId = promptNode.dataset.promptId;
        if (!promptId) {
            this.logger.error('New prompt node does not have a data-prompt-id attribute.');
            return;
        }
        const activeCharacterId = this.extension.getActiveCharacterId();
        const hierarchy = this.hierarchyData.get(activeCharacterId);

        if (hierarchy && !hierarchy.root.includes(promptId)) {
            hierarchy.root.push(promptId);
            this.hierarchyData.set(activeCharacterId, hierarchy);
            this.saveHierarchy();
        }
    }

    applyHierarchyToPrompts(prompts) {
        if (!Array.isArray(prompts)) {
            this.logger.error('Invalid prompts array received');
            return [];
        }

        const activeCharacterId = this.extension.getActiveCharacterId();
        const hierarchy = this.hierarchyData.get(activeCharacterId) || { root: [] };

        // Ensure all prompts exist in hierarchy
        prompts.forEach(prompt => {
            if (prompt && prompt.identifier && !hierarchy.root.includes(prompt.identifier)) {
                hierarchy.root.push(prompt.identifier);
            }
        });
        return this.sortPromptsByHierarchy(prompts, hierarchy);
    }

    sortPromptsByHierarchy(prompts, hierarchy) {
        return hierarchy.root
            .map(id => prompts.find(p => p?.identifier === id))
            .filter(Boolean); // Remove any null/undefined entries
    }

    renderPromptHierarchy() {
        const promptManager = this.getPromptManager();
        if (!promptManager) {
            this.logger.error('promptManager is not available. Render aborted.');
            return;
        }

        this.container.innerHTML = ''; // Clear the existing list
        this.loadHierarchy();

        const activeCharacterId = this.extension.getActiveCharacterId();
        const hierarchy = this.hierarchyData.get(activeCharacterId);

        if (!hierarchy) {
            this.logger.error(`Hierarchy not found for character: ${activeCharacterId}`);
            return;
        }

        const renderLevel = (promptIds, level = 0, parent = this.container) => {
            promptIds.forEach(promptId => {
                const promptConfig = promptManager.getPromptById(promptId);
                if (!promptConfig) {
                    this.logger.warn(`Prompt not found: ${promptId}`);
                    return;
                }

                const promptElement = document.createElement('li');
                promptElement.classList.add('completion_prompt_manager_prompt');
                promptElement.classList.add(`promptId-${promptId}`);
                promptElement.dataset.promptId = promptId;

                const promptNameSpan = document.createElement('span');
                promptNameSpan.classList.add('completion_prompt_manager_prompt_name');
                promptNameSpan.textContent = promptConfig.name;
                promptElement.appendChild(promptNameSpan);

                this.extension.domManager.addPromptControls(promptElement);

                promptElement.querySelector('.prompt-collapse-toggle').addEventListener('click', () => {
                    this.togglePromptCollapse(promptId);
                });

                const indentSize = this.extension.settings.indentSize;
                promptElement.style.marginLeft = `${level * indentSize}px`;

                parent.appendChild(promptElement);

                const promptData = this.getPromptData(promptId);
                if (promptData && promptData.children && !promptData.collapsed) {
                    renderLevel(promptData.children, level + 1, parent);
                }
            });
        };

        renderLevel(hierarchy.root);

        this.extension.domManager.initializeSortable(this.container);
    }

    togglePromptCollapse(promptId) {
        const activeCharacterId = this.extension.getActiveCharacterId();
        const hierarchy = this.hierarchyData.get(activeCharacterId);

        if (!hierarchy) {
            this.logger.error(`Hierarchy not found for character: ${activeCharacterId}`);
            return;
        }

        const toggleCollapseRecursive = (promptId, hierarchy) => {
            if (hierarchy.root.includes(promptId)) {
                if (!hierarchy[promptId]) {
                    hierarchy[promptId] = {
                        collapsed: false,
                        children: [],
                    }
                }
                hierarchy[promptId].collapsed = !hierarchy[promptId].collapsed;
                return true;
            }

            for (const key in hierarchy) {
                if (key !== 'root' && hierarchy[key].children) {
                    if(toggleCollapseRecursive(promptId, hierarchy[key])) {
                        return true;
                    }
                }
            }

            return false;
        };

        if (toggleCollapseRecursive(promptId, hierarchy)) {
            this.saveHierarchy();
            this.renderPromptHierarchy();
        } else {
            this.logger.warn(`Prompt not found in hierarchy: ${promptId}`);
        }
    }

    saveHierarchy() {
        const activeCharacterId = this.extension.getActiveCharacterId();
        if (this.hierarchyData.has(activeCharacterId)) {
            const serializedHierarchy = {};
            for (const [key, value] of this.hierarchyData.entries()) {
                serializedHierarchy[key] = this.serializeHierarchy(value);
            }

            this.extension.settings.promptHierarchy = serializedHierarchy;

            this.extension.saveSettings();
        } else {
            this.logger.warn(`No hierarchy data found for active character: ${activeCharacterId}`);
        }
    }

    serializeHierarchy(hierarchy) {
        const serialized = { root: hierarchy.root };
        if (hierarchy.children) {
            serialized.children = hierarchy.children.map(childId => childId.toString());
        }
        if (hierarchy.collapsed) {
            serialized.collapsed = hierarchy.collapsed;
        }
        if (hierarchy.level) {
            serialized.level = hierarchy.level;
        }

        return serialized;
    }

    cleanup() {
        this.hierarchyData.clear();
    }
}

export { HierarchyManager };
