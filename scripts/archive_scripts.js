const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'server', 'scripts');
const destDir = path.join(srcDir, 'archive');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

console.log(`📂 開始清理與歸檔 server/scripts/ 中的臨時腳本...`);
console.log(`源目錄: ${srcDir}`);
console.log(`目的目錄: ${destDir}\n`);

const files = fs.readdirSync(srcDir);
let movedCount = 0;

files.forEach(file => {
    const fullPath = path.join(srcDir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) return; // 忽略目錄自己
    
    // 判斷是否需要歸檔 (保留核心排程或常規運作腳本)
    const shouldArchive = 
        file.startsWith('inject_batch_') ||
        file.startsWith('extract_batch_') ||
        file.startsWith('test_') ||
        file.startsWith('check_') ||
        file.startsWith('debug_') ||
        file.startsWith('fix_') ||
        file.startsWith('get_') ||
        file.startsWith('verify_') ||
        file.startsWith('migrate_') ||
        file === 'extract_batch.js' ||
        file === 'extract_context_v2.js' ||
        file === 'final_cleanup.js' ||
        file === 'find_financial_tables.js' ||
        file === 'find_orphans.js' ||
        file === 'force_clear_processing.js' ||
        file === 'full_inventory.js' ||
        file === 'gen_refined_slim_v2.js' ||
        file === 'gen_slim_dump.js' ||
        file === 'init_ingestion_stats.js' ||
        file === 'init_sentiment_db.js' ||
        file === 'insert_demo_reports.js' ||
        file === 'investigate_loss.js' ||
        file === 'list_seqs.js' ||
        file === 'list_ticks_tables.js' ||
        file === 'maintenance_reset.js' ||
        file === 'merge_per_to_daily.js' ||
        file === 'reconstruct_ticks.js' ||
        file === 'regenerate_report.js' ||
        file === 'reset_sentiment.js' ||
        file === 'retry_reset.js' ||
        file === 'sample_fm_inst.js' ||
        file === 'sentiment_stats.js' ||
        file === 'size_audit.js' ||
        file === 'sync_all_per.js' ||
        file === 'sync_batch_8_p12_per.js' ||
        file === 'sync_missing_prices.js' ||
        file === 'truncate_per.js' ||
        file === 'update_template_v3.js';

    if (shouldArchive) {
        const destPath = path.join(destDir, file);
        fs.renameSync(fullPath, destPath);
        console.log(` [歸檔] ${file} -> archive/${file}`);
        movedCount++;
    }
});

console.log(`\n✨ 歸檔完成！共整理並移除了 ${movedCount} 個臨時腳本。`);
