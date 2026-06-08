const pool = require('../db');

/**
 * Get an active API key by service name from the database.
 * Falls back to process.env if not found in the database.
 * 
 * @param {string} serviceName - The service name (e.g., 'openai', 'gemini')
 * @returns {Promise<string|null>} - The API key or null if not found
 */
async function getApiKey(serviceName) {
    try {
        const result = await pool.query(
            'SELECT api_key FROM system_api_keys WHERE service_name = $1 AND is_active = true',
            [serviceName]
        );
        if (result.rows.length > 0) {
            // Randomly select one active key (Round-Robin simulation)
            const randomIndex = Math.floor(Math.random() * result.rows.length);
            return result.rows[randomIndex].api_key;
        }
    } catch (err) {
        console.error(`Error fetching API key for ${serviceName} from DB:`, err);
    }
    
    // Fallback to environment variables
    // Map common service names to typical env var names
    const envMap = {
        'openai': 'OPENAI_API_KEY',
        'gemini': 'GEMINI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'finnhub': 'FINNHUB_API_KEY',
        'fugle': 'FUGLE_API_KEY'
    };
    
    const envVarName = envMap[serviceName.toLowerCase()] || `${serviceName.toUpperCase()}_API_KEY`;
    return process.env[envVarName] || null;
}

module.exports = {
    getApiKey
};
