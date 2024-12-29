/**
 * Logger class for consistent logging across the extension
 * @class
 */
export class Logger {
    /**
     * Creates a new Logger instance
     * @param {string} prefix Module prefix for log messages
     */
    constructor(prefix) {
        this.prefix = prefix;
        this.debugEnabled = true; 
        this.traceEnabled = true;
        this.debug('Logger initialized');
    }

    /**
     * Format a log message with the prefix
     * @private
     * @param {any[]} args Arguments to log
     * @returns {any[]} Formatted arguments
     */
    formatMessage(...args) {
        return [`[${this.prefix}]`, ...args];
    }

    /**
     * Log debug message
     * @param {...any} args Arguments to log
     */
    debug(...args) {
        if (!this.debugEnabled) return;
        console.debug(...this.formatMessage(...args));
    }

    /**
     * Log info message
     * @param {...any} args Arguments to log
     */
    info(...args) {
        console.info(...this.formatMessage(...args));
    }

    /**
     * Log error message with stack trace
     * @param {...any} args Arguments to log
     */
    error(...args) {
        console.error(...this.formatMessage(...args));
        console.trace();
    }

    /**
     * Log warning message
     * @param {...any} args Arguments to log
     */  
    warn(...args) {
        console.warn(...this.formatMessage(...args));
    }

    /**
     * Log method entry/exit with stack trace
     * @param {string} method Method name
     * @param {boolean} [entering=true] Whether entering or exiting
     */
    trace(method, entering = true) {
        if (!this.traceEnabled) return;
        const action = entering ? 'ENTER' : 'EXIT';
        console.log(...this.formatMessage(`${action} ${method}`));
        if (entering) console.trace();
    }

    /**
     * Enable debug logging
     */
    enableDebug() {
        this.debugEnabled = true;
    }

    /**
     * Disable debug logging
     */
    disableDebug() {
        this.debugEnabled = false;
    }
}