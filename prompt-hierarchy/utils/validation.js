/**
 * Validates prompt data structure
 * @param {Object} promptData - The prompt data to validate
 * @returns {boolean} - Whether the data is valid
 */
export function validatePromptData(promptData) {
    if (!promptData || typeof promptData !== 'object') {
        return false;
    }

    const requiredFields = ['id', 'name'];
    return requiredFields.every(field => field in promptData);
}

/**
 * Validates hierarchy structure
 * @param {Object} hierarchy - The hierarchy to validate
 * @returns {boolean} - Whether the hierarchy is valid
 */
export function validateHierarchy(hierarchy) {
    if (!hierarchy || !Array.isArray(hierarchy.root)) {
        return false;
    }

    return hierarchy.root.every(id => typeof id === 'string');
}
