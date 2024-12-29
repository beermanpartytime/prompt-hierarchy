// PromptManager.js

export class PromptListManager {
    constructor(extension) {
        this.extension = extension;
        this.container = null; // Will be set in init()
    }

    init() {
        try {
            this.logger.debug('Initializing...');
        this.container = document.getElementById('completion_prompt_manager_list');
        if (!this.container) {
            this.extension.logger.error('Prompt container not found');
            return;
        }
        this.container.classList.add('hierarchy-enabled');
        this.render();
        } catch (err) {
            this.logger.error('Failed to initialize:', err);
            throw err; 
        }
    }

    cleanup() {
        this.logger.debug('Cleaning up...');
    }

    render() {
        // Clear the container
        this.container.innerHTML = '';

        // Get the active character's hierarchy
        const context = window.SillyTavern.getContext();
        const activeCharacterId = context.characterId;
        const hierarchy = this.extension.settings.promptHierarchy[activeCharacterId] || { root: [] };
        
        // Render the prompts recursively
        hierarchy.root.forEach(promptId => this.renderPrompt(promptId));
    }

    renderPrompt(promptId, level = 0) {
        const promptData = this.extension.hierarchyManager.getPromptData(promptId);
        if (!promptData) return;

        // Create the prompt element (we'll refine this later)
        const promptElement = document.createElement('li');
        promptElement.classList.add('completion_prompt_manager_prompt', `promptId-${promptId}`);
        // ... add controls, etc.

        // Add to the container
        this.container.appendChild(promptElement);

        // Render children if not collapsed
        if (promptData.children && !promptData.collapsed) {
            promptData.children.forEach(childId => this.renderPrompt(childId, level + 1));
        }
    }

    // ... other methods for adding, removing, updating prompts
}
