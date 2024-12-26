// utils/logger.js

class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.logLevels = {
            DEBUG: 1,
            INFO: 2,
            WARNING: 3,
            ERROR: 4,
        };
        this.logLevel = this.logLevels.DEBUG; // Set to DEBUG for maximum output during development
    }

    // Check if the environment is a browser
    isBrowser() {
        return typeof window !== 'undefined' && typeof window.document !== 'undefined';
    }

    // Check if the environment is Node.js
    isNode() {
        return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    }

    setLogLevel(level) {
        if (typeof level === 'string') {
            this.logLevel = this.logLevels[level.toUpperCase()] || this.logLevels.WARNING;
        } else if (typeof level === 'number') {
            this.logLevel = level;
        } else {
            this.warning(`Invalid log level: ${level}`);
        }
    }

    // Internal logging method (used by debug, info, warning, error)
    _log(level, ...args) {
        if (this.logLevel <= this.logLevels[level]) {
            const prefix = `[${level}] [${this.moduleName}]`;
            if (this.isBrowser()) {
                // Browser-specific logging with styles
                const logStyle = 'background: #222; color: #bada55';
                console.log(`%c${prefix}`, logStyle, ...args);
            } else if (this.isNode()) {
                // Node.js-specific logging with ANSI colors
                const color = {
                    reset: '\x1b[0m',
                    DEBUG: '\x1b[34m',  // Blue
                    INFO: '\x1b[32m',   // Green
                    WARNING: '\x1b[33m',// Yellow
                    ERROR: '\x1b[31m',  // Red
                };
                console.log(`${color[level]}${prefix}${color.reset}`, ...args);
            } else {
                // Fallback for other environments
                console.log(prefix, ...args);
            }
        }
    }

    // Public logging methods
    debug(...args) {
        this._log('DEBUG', ...args);
    }

    info(...args) {
        this._log('INFO', ...args);
    }

    warn(...args) {
        this._log('WARNING', ...args);
    }

    error(...args) {
        this._log('ERROR', ...args);
    }

    // Special trace method (for method entry/exit)
    trace(methodName, entering = true) {
        const action = entering ? 'Entering' : 'Exiting';
        this._log('DEBUG', `${action} ${methodName}`); // Use _log for consistent formatting
    }
}

// Export the Logger class
export { Logger };