const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'stock_screener',
    password: 'postgres123',
    port: 5533,
});

async function updateAdmin() {
    try {
        const passwordHash = bcrypt.hashSync('newreply01', 10);
        const query = 'UPDATE users SET password_hash = \, is_verified = TRUE WHERE email = \';
        const values = [passwordHash, 'newreply01@gmail.com'];
        const res = await pool.query(query, values);
        console.log(\Successfully updated \ row(s).\);
    } catch (err) {
        console.error('Error updating account:', err);
    } finally {
        await pool.end();
    }
}

updateAdmin();
