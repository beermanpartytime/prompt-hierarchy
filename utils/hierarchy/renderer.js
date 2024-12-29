export class HierarchyRenderer {
    constructor(core) {
        this.core = core;
        this.logger = core.logger;
    }

    render() {
        const tokenCounts = this.preserveTokenCounts();
        const promptManager = this.getPromptManager();
        if (!promptManager) return;

        this.clearContainer();
        this.loadHierarchy();

        const activeCharacterId = this.core.extension.getActiveCharacterId();
        const hierarchy = this.core.hierarchyData.get(activeCharacterId);
        if (!hierarchy) return;

        this.renderHierarchyLevels(hierarchy);
        this.restoreTokenCounts(tokenCounts);
        this.initializeSortable();
    }

    preserveTokenCounts() {
        const counts = {};
        document.querySelectorAll('.completion_prompt_manager_prompt').forEach(prompt => {
            const id = this.core.getPromptId(prompt);
            const tokens = prompt.querySelector('.prompt_manager_prompt_tokens')?.textContent;
            if (id && tokens) counts[id] = tokens;
        });
        return counts;
    }

    renderPrompt(promptId, level, parent) {
        // Prompt rendering logic
    }
}