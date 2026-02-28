import fs from 'node:fs';
import path from 'node:path';

const REPLACEMENTS = [
    { from: /Cashewnut-labs\/bolt\.diy/g, to: 'Divith123/Cashewnut' },
    { from: /Cashewnut-labs\.github\.io\/bolt\.diy/g, to: 'cashewnut.me' },
    { from: /Cashewnut/gi, to: 'Cashewnut' },
    { from: /Bolt\.diy/gi, to: 'Cashewnut' },
    { from: /bolt\.diy\b/gi, to: 'cashewnut' },
    { from: /Bolt\.new/gi, to: 'Cashewnut' },
    { from: /bolt\.new\b/gi, to: 'cashewnut.me' },
    { from: /Talk with Cashewnut/g, to: 'Talk with Cashewnut' },
    { from: /Cashewnut is initializing/g, to: 'Cashewnut is initializing' },
    { from: /Welcome to Cashewnut/g, to: 'Welcome to Cashewnut' },
    { from: /Let Cashewnut/g, to: 'Let Cashewnut' },
    { from: /Ask Cashewnut/g, to: 'Ask Cashewnut' },
    { from: /\bBolt (can|will|is|has|does|makes|allows|features)\b/g, to: 'Cashewnut $1' },
    { from: /\bfrom Bolt\b/g, to: 'from Cashewnut' },
    { from: /\bwith Bolt\b/g, to: 'with Cashewnut' },
    { from: /\bby Bolt\b/g, to: 'by Cashewnut' },
    { from: /\bfor Bolt\b/g, to: 'for Cashewnut' },
    { from: /\buse Bolt\b/g, to: 'use Cashewnut' },
    { from: /\busing Bolt\b/g, to: 'using Cashewnut' },
    { from: /\brun Bolt\b/g, to: 'run Cashewnut' },
    { from: /\brunning Bolt\b/g, to: 'running Cashewnut' },
    { from: />Cashewnut</g, to: '>Cashewnut<' },
    { from: /"Cashewnut"/g, to: '"Cashewnut"' },
    { from: /'Cashewnut'/g, to: "'Cashewnut'" },
];

const IGNORE_DIRS = ['.git', 'node_modules', '.wrangler', 'dist', 'build', '.idea', '.vscode', 'public', 'logo', 'icons'];
const ALLOWED_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.scss', '.yaml', '.yml'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                results = results.concat(walk(fullPath));
            }
        } else {
            if (ALLOWED_EXTS.includes(path.extname(file))) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

function rebrand() {
    const files = walk(path.resolve('.'));
    let changedFiles = 0;

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // Quick skip if no likely matches
        if (!content.match(/bolt|Cashewnut/i)) return;

        for (const rule of REPLACEMENTS) {
            if (content.match(rule.from)) {
                content = content.replace(rule.from, rule.to);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            changedFiles++;
            console.log(`Updated: ${path.relative(process.cwd(), file)}`);
        }
    });
    console.log(`\nRebranding complete. Updated ${changedFiles} files.`);
}

rebrand();
