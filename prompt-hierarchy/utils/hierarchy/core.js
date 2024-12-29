export class HierarchyCore {
    constructor(extension) {
        this.extension = extension;
        this.logger = extension.logger;
        this.hierarchyData = new Map();
        this.ready = false;
    }

    getPromptData(promptId) {
        const activeCharacterId = this.extension.getActiveCharacterId();
        const characterHierarchy = this.hierarchyData.get(activeCharacterId);
        return this.findPromptData(promptId, characterHierarchy);
    }

    getPromptId(promptElement) {
        if (!promptElement) return null;
        const id = promptElement.dataset.pmIdentifier || 
                  promptElement.dataset.promptId ||
                  promptElement.id;
        return id || null;
    }

    calculateNestingLevel(id, hierarchy, visited = new Set()) {
        if (visited.has(id)) {
            this.logger.error('Circular reference detected:', id);
            return 0;
        }
        visited.add(id);
        const parent = Object.entries(hierarchy).find(([_, data]) =>
            data.children && data.children.includes(id)
        );
        return parent ? 1 + this.calculateNestingLevel(parent[0], hierarchy, visited) : 0;
    }

    cleanup() {
        this.hierarchyData.clear();
        this.ready = false;
    }
}