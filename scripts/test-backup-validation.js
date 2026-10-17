const { verifySqlBackupIntegrity } = require('./backup-database.js');
const fs = require('fs');

console.log('=== RUNNING BACKUP VALIDATION TESTS ===');

// Test 1: Empty file
fs.writeFileSync('temp_empty.sql', '');
try {
    verifySqlBackupIntegrity('temp_empty.sql');
    console.log('Test 1 FAIL: Empty file was not rejected.');
} catch (e) {
    console.log('Test 1 PASS (empty rejected):', e.message);
} finally {
    if (fs.existsSync('temp_empty.sql')) fs.unlinkSync('temp_empty.sql');
}

// Test 2: Fake JSON manifest (612-byte bug pattern)
fs.writeFileSync('temp_fake.sql', '{\n  "version": "0.1.0",\n  "tables": []\n}');
try {
    verifySqlBackupIntegrity('temp_fake.sql');
    console.log('Test 2 FAIL: Fake JSON manifest was not rejected.');
} catch (e) {
    console.log('Test 2 PASS (fake json rejected):', e.message);
} finally {
    if (fs.existsSync('temp_fake.sql')) fs.unlinkSync('temp_fake.sql');
}

// Test 3: Valid SQL dump header
fs.writeFileSync('temp_valid.sql', '-- PostgreSQL database dump\nSET statement_timeout = 0;\n');
try {
    const sz = verifySqlBackupIntegrity('temp_valid.sql');
    console.log('Test 3 PASS (valid SQL header accepted):', sz, 'bytes');
} catch (e) {
    console.log('Test 3 FAIL: Valid SQL was unexpectedly rejected:', e.message);
} finally {
    if (fs.existsSync('temp_valid.sql')) fs.unlinkSync('temp_valid.sql');
}

console.log('=== ALL INTEGRITY TESTS COMPLETED ===');
