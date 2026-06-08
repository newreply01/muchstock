/**
 * Unified Logger Utility
 * In production mode, debug and log messages are suppressed.
 */
const isProd = import.meta.env.PROD;

export const logger = {
    log: (...args) => {
        if (!isProd) {
            console.log(...args);
        }
    },
    warn: (...args) => {
        if (!isProd) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        // Errors are usually kept even in production, or sent to a reporting service
        console.error(...args);
    },
    info: (...args) => {
        if (!isProd) {
            console.info(...args);
        }
    },
    debug: (...args) => {
        if (!isProd) {
            console.debug(...args);
        }
    }
};

export default logger;
