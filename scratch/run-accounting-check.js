const fs = require('fs');
const path = require('path');

const dcPath = path.join(__dirname, '..', 'src', 'context', 'DataContext.tsx');
const dcContent = fs.readFileSync(dcPath, 'utf-8');

console.log('=== ACCOUNTING & LEDGER INTEGRITY CHECK ===');
console.log('Includes addJournalEntry:', dcContent.includes('addJournalEntry'));

const journalEntryMatches = dcContent.match(/addJournalEntry\(\{[\s\S]*?\}\);/g) || [];
console.log('Total addJournalEntry calls in DataContext:', journalEntryMatches.length);

journalEntryMatches.forEach((match, idx) => {
    console.log(`\n--- Match #${idx + 1} ---`);
    console.log(match.slice(0, 250));
});
