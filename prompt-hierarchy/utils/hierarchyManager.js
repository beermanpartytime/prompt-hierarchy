import { HierarchyCore } from './hierarchy/core.js';
import { HierarchyInitializer } from './hierarchy/initialization.js';
import { HierarchyRenderer } from './hierarchy/renderer.js';

export class HierarchyManager {
    constructor(extension) {
        this.core = new HierarchyCore(extension);
        this.initializer = new HierarchyInitializer(this.core);
        this.renderer = new HierarchyRenderer(this.core);
        
        // Bind methods
        this.initialize = this.initializer.initialize.bind(this.initializer);
        this.render = this.renderer.render.bind(this.renderer);
        this.getPromptData = this.core.getPromptData.bind(this.core);
        this.cleanup = this.core.cleanup.bind(this.core);
    }

    async init() {
        await this.initialize();
        this.render();
    }

    updatePrompt(promptId, data) {
        this.core.updatePromptData(promptId, data);
        this.renderer.render();
    }

    toggleCollapse(promptId) {
        const data = this.core.getPromptData(promptId);
        if (data) {
            data.collapsed = !data.collapsed;
            this.renderer.render();
        }
    }
}