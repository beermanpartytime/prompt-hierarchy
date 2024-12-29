export class HierarchyInitializer {
    constructor(core) {
        this.core = core;
        this.logger = core.logger;
    }

    async initialize() {
        try {
            const [promptManager, context] = await Promise.all([
                this.waitForPromptManager(),
                this.waitForContext()
            ]);
            
            if (!promptManager || !context) {
                throw new Error('Dependencies missing');
            }

            await this.loadHierarchy();
            this.core.ready = true;
            return true;
        } catch (error) {
            this.logger.error('Initialization failed:', error);
            throw error;
        }
    }

    async waitForPromptManager(timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const pm = window.SillyTavern?.getContext()?.promptManager;
            if (pm?.getPrompts) return pm;
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error('Prompt manager timeout');
    }

    async waitForContext(timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const ctx = window.SillyTavern?.getContext();
            if (ctx?.prompts) return ctx;
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error('Context timeout');
    }
}