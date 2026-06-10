// server/utils/response.js

/**
 * Standardize success API response
 * @param {Response} res Express response object
 * @param {Object|Array} data The main data to return
 * @param {Object} meta Additional metadata (e.g., pagination info)
 */
const success = (res, data = {}, meta = {}) => {
    return res.json({
        success: true,
        data,
        ...meta
    });
};

/**
 * Standardize error API response
 * @param {Response} res Express response object
 * @param {String} error Error message
 * @param {Number} status HTTP status code (default: 500)
 */
const error = (res, errorMsg = 'Internal Server Error', status = 500) => {
    return res.status(status).json({
        success: false,
        error: errorMsg
    });
};

module.exports = {
    success,
    error
};
