// utils/utilities.js

/**
 * Checks if a variable is a plain object.
 *
 * @param {*} item - The variable to check.
 * @returns {boolean} True if the variable is a plain object, false otherwise.
 */
function isPlainObject(item) {
    return item !== null && typeof item === 'object' && item.constructor === Object;
}

/**
 * Deep merges two objects.
 *
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns {Object} The merged object.
 */
function deepMerge(target, source) {
    const output = { ...target };

    if (isPlainObject(target) && isPlainObject(source)) {
        Object.keys(source).forEach(key => {
            if (isPlainObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
}

/**
 * Debounces a function call.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce time in milliseconds.
 * @param {boolean} [immediate=false] - Whether to execute the function immediately.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function (...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
* Sanitizes a string for use as a CSS selector or ID.
* Replaces invalid characters with underscores.
*
* @param {string} str - The string to sanitize.
* @returns {string} The sanitized string.
*/
function sanitizeForSelector(str) {
   return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export { deepMerge, debounce, sanitizeForSelector };
