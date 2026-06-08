const { drizzle } = require('drizzle-orm/node-postgres');
const { pool } = require('../db'); // Reuse the existing configured pg pool
const schema = require('./schema');

// Initialize drizzle with the existing pg pool and schema
const db = drizzle(pool, { schema });

module.exports = {
    db,
    schema
};
