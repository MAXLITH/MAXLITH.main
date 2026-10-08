const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk(dir);

const replacements = [
    // Remove excessive border radius
    { regex: /rounded-2xl/g, replacement: 'rounded-md' },
    { regex: /rounded-xl/g, replacement: 'rounded' },
    { regex: /rounded-lg/g, replacement: 'rounded' },
    { regex: /rounded-full/g, replacement: 'rounded-sm' }, // Be careful, might break avatars or pills, but in a trading terminal pills are usually just small rounded squares

    // Shadows & glow
    { regex: /shadow-2xl/g, replacement: 'shadow-sm' },
    { regex: /shadow-xl/g, replacement: 'shadow-sm' },
    { regex: /shadow-lg/g, replacement: 'shadow-sm' },
    { regex: /shadow-md/g, replacement: 'shadow-sm' },
    { regex: /shadow-[a-z]+-[0-9]+\/[0-9]+/g, replacement: '' }, // e.g. shadow-blue-500/20

    // Gradients
    { regex: /bg-gradient-to-[a-z]+/g, replacement: '' },
    { regex: /from-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
    { regex: /via-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
    { regex: /to-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
    { regex: /bg-\[radial-gradient\([^\]]+\)\]/g, replacement: '' },

    // Padding reductions (make more dense)
    { regex: /p-6/g, replacement: 'p-4' },
    { regex: /p-8/g, replacement: 'p-4' },
    { regex: /p-12/g, replacement: 'p-6' },
    { regex: /px-6/g, replacement: 'px-4' },
    { regex: /py-6/g, replacement: 'py-3' },
    { regex: /px-8/g, replacement: 'px-4' },
    { regex: /py-8/g, replacement: 'py-4' },
    { regex: /gap-6/g, replacement: 'gap-4' },
    { regex: /gap-8/g, replacement: 'gap-4' },
    { regex: /space-y-6/g, replacement: 'space-y-4' },
    { regex: /space-y-8/g, replacement: 'space-y-4' },
    
    // AI specifically
    { regex: /animate-pulse/g, replacement: '' }, // Remove unnecessary animations
];

let totalChanges = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    for (const r of replacements) {
        content = content.replace(r.regex, r.replacement);
    }
    
    // Clean up double spaces caused by removing classes
    content = content.replace(/\s{2,}/g, ' ').replace(/ \}/g, '}').replace(/ \)/g, ')').replace(/ "/g, '"');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        totalChanges++;
    }
}

console.log(`Updated ${totalChanges} files.`);
