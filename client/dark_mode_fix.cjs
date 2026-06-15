const fs = require('fs');
const path = require('path');

// Recursively find all JSX files
function findJsxFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findJsxFiles(filePath, fileList);
        } else if (filePath.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const componentDir = path.join(__dirname, 'src', 'components');
const files = findJsxFiles(componentDir);

let filesModified = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace background colors
    // We want to match "bg-white" but not "bg-white/" and only if "dark:bg-" isn't already there.
    content = content.replace(/\bbg-white\b(?!\/)/g, 'bg-white dark:bg-slate-900');
    content = content.replace(/\bbg-slate-50\b(?!\/)/g, 'bg-slate-50 dark:bg-slate-800');
    content = content.replace(/\bbg-slate-100\b(?!\/)/g, 'bg-slate-100 dark:bg-slate-800');

    // Text colors
    content = content.replace(/\btext-slate-900\b/g, 'text-slate-900 dark:text-slate-50');
    content = content.replace(/\btext-slate-800\b/g, 'text-slate-800 dark:text-slate-100');
    content = content.replace(/\btext-gray-900\b/g, 'text-gray-900 dark:text-gray-50');
    content = content.replace(/\btext-gray-800\b/g, 'text-gray-800 dark:text-gray-100');
    
    // Border colors
    content = content.replace(/\bborder-slate-200\b/g, 'border-slate-200 dark:border-slate-800');
    content = content.replace(/\bborder-slate-100\b/g, 'border-slate-100 dark:border-slate-800');
    content = content.replace(/\bborder-gray-200\b/g, 'border-gray-200 dark:border-slate-800');

    // Deduplicate any double dark classes that might have been created
    // e.g., if it was already "bg-white dark:bg-slate-900", our script makes it "bg-white dark:bg-slate-900 dark:bg-slate-900"
    content = content.replace(/dark:bg-slate-900\s+dark:bg-slate-900/g, 'dark:bg-slate-900');
    content = content.replace(/dark:bg-slate-800\s+dark:bg-slate-800/g, 'dark:bg-slate-800');
    content = content.replace(/dark:text-slate-50\s+dark:text-slate-50/g, 'dark:text-slate-50');
    content = content.replace(/dark:text-slate-100\s+dark:text-slate-100/g, 'dark:text-slate-100');
    content = content.replace(/dark:text-gray-50\s+dark:text-gray-50/g, 'dark:text-gray-50');
    content = content.replace(/dark:text-gray-100\s+dark:text-gray-100/g, 'dark:text-gray-100');
    content = content.replace(/dark:border-slate-800\s+dark:border-slate-800/g, 'dark:border-slate-800');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        filesModified++;
    }
}

console.log(`Successfully updated ${filesModified} files with dark mode classes.`);
