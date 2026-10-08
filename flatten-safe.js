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
    // Backgrounds
    { regex: /bg-slate-900/g, replacement: 'bg-max-bg' },
    { regex: /bg-slate-800/g, replacement: 'bg-max-surface' },
    { regex: /bg-slate-800\/50/g, replacement: 'bg-max-surface' },
    { regex: /bg-slate-800\/60/g, replacement: 'bg-max-surface' },
    { regex: /bg-\[\#0B0E14\]/g, replacement: 'bg-max-bg' },
    { regex: /bg-\[\#121824\]/g, replacement: 'bg-max-surface' },
    { regex: /bg-\[\#090e14\]/g, replacement: 'bg-max-bg' },
    { regex: /from-\[\#121824\]/g, replacement: 'bg-max-surface' },
    { regex: /to-\[\#161e30\]/g, replacement: 'bg-max-surface' },

    // Texts
    { regex: /text-slate-400/g, replacement: 'text-max-text-secondary' },
    { regex: /text-slate-500/g, replacement: 'text-max-text-muted' },
    { regex: /text-slate-300/g, replacement: 'text-max-text-primary' },
    { regex: /text-gray-400/g, replacement: 'text-max-text-secondary' },
    { regex: /text-gray-500/g, replacement: 'text-max-text-muted' },
    { regex: /text-blue-500/g, replacement: 'text-max-brand-primary' },
    { regex: /text-blue-400/g, replacement: 'text-max-brand-primary' },
    { regex: /text-emerald-500/g, replacement: 'text-max-market-positive' },
    { regex: /text-emerald-400/g, replacement: 'text-max-market-positive' },
    { regex: /text-red-500/g, replacement: 'text-max-market-negative' },
    { regex: /text-red-400/g, replacement: 'text-max-market-negative' },

    // Borders
    { regex: /border-slate-800/g, replacement: 'border-max-border' },
    { regex: /border-slate-700/g, replacement: 'border-max-border-strong' },
    { regex: /border-gray-800/g, replacement: 'border-max-border' },
    { regex: /divide-slate-800\/60/g, replacement: 'divide-max-border' },

    // Hovers
    { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-max-surface-hover' },
    { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-max-surface-hover' },
    { regex: /hover:text-blue-400/g, replacement: 'hover:text-max-brand-secondary' },

    // Flatten UI (No card borders and padding reductions)
    { regex: /rounded-2xl/g, replacement: 'rounded-md' },
    { regex: /rounded-xl/g, replacement: 'rounded' },
    { regex: /rounded-lg/g, replacement: 'rounded' },
    { regex: /rounded-full/g, replacement: 'rounded' },
    { regex: /shadow-2xl/g, replacement: '' },
    { regex: /shadow-xl/g, replacement: '' },
    { regex: /shadow-lg/g, replacement: '' },
    { regex: /shadow-md/g, replacement: '' },
    { regex: /shadow-[a-z]+-[0-9]+\/[0-9]+/g, replacement: '' },

    // Padding reductions for density
    { regex: /p-6/g, replacement: 'p-4' },
    { regex: /p-8/g, replacement: 'p-4' },
    { regex: /px-6/g, replacement: 'px-4' },
    { regex: /py-6/g, replacement: 'py-3' },

    // Remove Gradients
    { regex: /bg-gradient-to-[a-z]+/g, replacement: '' },
    { regex: /from-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
    { regex: /via-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
    { regex: /to-[a-z]+-[0-9]+(\/[0-9]+)?/g, replacement: '' },
];

let totalChanges = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    for (const r of replacements) {
        content = content.replace(r.regex, r.replacement);
    }
    
    // Clean up empty class spaces safely (only multiple spaces inside quotes)
    // Avoid stripping newlines by making sure we don't replace line breaks
    // Actually it's safer to just let Prettier handle extra spaces in className="..."
    content = content.replace(/className="([^"]+)"/g, (match, p1) => {
        const cleaned = p1.replace(/ +/g, ' ').trim();
        return `className="${cleaned}"`;
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        totalChanges++;
    }
}

console.log(`Updated ${totalChanges} files.`);
