/**
 * GariSphere DMS — Production Database Backup Utility
 * 
 * Usage:
 *   node scripts/backup-database.js
 * 
 * Environment Requirements:
 *   - SUPABASE_DB_URL or DATABASE_URL: PostgreSQL connection URI (e.g., postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres).
 *   - PostgreSQL client tool: `pg_dump` must be installed and available on system PATH.
 * 
 * Behavior & Guarantees:
 *   - Fails immediately with exit code 1 if required connection string is missing (no fake fallbacks).
 *   - Checks for `pg_dump` availability before attempting dump.
 *   - Verifies backup file existence, non-zero size, and SQL header structure before marking successful.
 *   - Cleans up partial / zero-byte artifacts on failure.
 *   - Never prints passwords, tokens, or credentials to logs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_LOCAL_DIR || path.join(__dirname, '..', 'backups');
const BACKUP_FORMAT = (process.env.BACKUP_FORMAT || 'plain').toLowerCase(); // 'plain' (.sql) or 'custom' (.dump)

function sanitizeDbUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        if (parsed.password) {
            parsed.password = '***';
        }
        return parsed.toString();
    } catch {
        return 'postgresql://***@***/***';
    }
}

function checkToolAvailability(toolName) {
    try {
        const isWindows = process.platform === 'win32';
        const cmd = isWindows ? `where.exe ${toolName}` : `which ${toolName}`;
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function verifySqlBackupIntegrity(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Integrity verification failed: File not found at ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        throw new Error(`Integrity verification failed: Backup file is empty (0 bytes).`);
    }

    // Read first 2KB to check SQL structure
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(2048, stats.size));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const header = buffer.toString('utf8');

    // Plain SQL check
    if (BACKUP_FORMAT === 'plain') {
        const isSqlDump = header.includes('--') || header.includes('PostgreSQL database dump') || header.includes('SET ');
        if (!isSqlDump) {
            throw new Error(`Integrity verification failed: File does not appear to be a valid PostgreSQL plain text dump.`);
        }
    } else {
        // Custom format magic header (PGDMP)
        const isCustomDump = buffer.slice(0, 5).toString('binary') === 'PGDMP';
        if (!isCustomDump) {
            throw new Error(`Integrity verification failed: File does not appear to be a valid PostgreSQL custom archive (PGDMP header missing).`);
        }
    }

    return stats.size;
}

async function runBackup() {
    const startTime = new Date();
    const timestamp = startTime.toISOString().replace(/[:.]/g, '-');
    const ext = BACKUP_FORMAT === 'custom' ? 'dump' : 'sql';
    const backupFileName = `garisphere-backup-${timestamp}.${ext}`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    console.log(`[BACKUP] Initializing GariSphere database backup...`);
    console.log(`[BACKUP] Target destination: ${backupFilePath}`);
    console.log(`[BACKUP] Format: ${BACKUP_FORMAT.toUpperCase()}`);

    // Ensure directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Avoid collision
    if (fs.existsSync(backupFilePath)) {
        console.error(`[BACKUP ERROR] Destination file already exists: ${backupFilePath}`);
        process.exit(1);
    }

    // 1. Validate Database Configuration
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error(`[BACKUP ERROR] Missing required database configuration.`);
        console.error(`[BACKUP ERROR] Neither SUPABASE_DB_URL nor DATABASE_URL is set in environment.`);
        console.error(`[BACKUP ERROR] Aborting. Synthetic or simulated backups are prohibited.`);
        process.exit(1);
    }

    console.log(`[BACKUP] Database Target: ${sanitizeDbUrl(dbUrl)}`);

    // 2. Validate Tooling Availability
    if (!checkToolAvailability('pg_dump')) {
        console.error(`[BACKUP ERROR] PostgreSQL backup tool 'pg_dump' was not found on system PATH.`);
        console.error(`[BACKUP ERROR] Please install postgresql-client or run inside a container equipped with PostgreSQL tools.`);
        process.exit(1);
    }

    // 3. Execute Backup Command
    console.log(`[BACKUP] Running pg_dump against database...`);
    const formatFlag = BACKUP_FORMAT === 'custom' ? '-F c' : '-F p';
    const cmd = `pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-privileges ${formatFlag} -f "${backupFilePath}"`;

    try {
        execSync(cmd, { stdio: 'pipe' });

        // 4. Verify Backup Integrity
        console.log(`[BACKUP] Verifying exported file integrity...`);
        const verifiedSize = verifySqlBackupIntegrity(backupFilePath);

        const durationSeconds = ((new Date() - startTime) / 1000).toFixed(2);
        console.log(`[BACKUP SUCCESS] Verified backup created successfully!`);
        console.log(`[BACKUP SUCCESS] File: ${backupFilePath}`);
        console.log(`[BACKUP SUCCESS] Size: ${verifiedSize} bytes (${(verifiedSize / 1024).toFixed(2)} KB)`);
        console.log(`[BACKUP SUCCESS] Elapsed time: ${durationSeconds}s`);

        return backupFilePath;
    } catch (err) {
        console.error(`[BACKUP FAILED] Dump execution failed: ${err.message}`);

        // Clean up partial or empty artifact
        if (fs.existsSync(backupFilePath)) {
            try {
                fs.unlinkSync(backupFilePath);
                console.log(`[BACKUP CLEANUP] Removed partial / invalid file: ${backupFilePath}`);
            } catch (cleanupErr) {
                console.error(`[BACKUP CLEANUP ERROR] Failed to delete invalid file: ${cleanupErr.message}`);
            }
        }

        process.exit(1);
    }
}

if (require.main === module) {
    runBackup();
}

module.exports = { runBackup, sanitizeDbUrl, checkToolAvailability, verifySqlBackupIntegrity };
