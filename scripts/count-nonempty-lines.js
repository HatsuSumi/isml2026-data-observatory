#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOTS = ['js', 'css', 'pages', 'templates', 'index.html'];
const SKIP_DIRS = new Set(['.git', '.vscode', 'node_modules', '.cursor', '.idea', '.specstory', 'data', 'images', 'scripts']);
const SKIP_FILES = new Set(['package-lock.json']);
const TEXT_EXTENSIONS = new Set([
    '.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.json', '.md', '.txt', '.xml', '.svg', '.yml', '.yaml'
]);

function walk(dir, files = []) {
    if (fs.existsSync(dir) && fs.statSync(dir).isFile()) {
        files.push(dir);
        return files;
    }

    if (!fs.existsSync(dir)) {
        return files;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath, files);
        } else if (entry.isFile() && !SKIP_FILES.has(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

function isLikelyBinary(buffer) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
    for (const byte of sample) {
        if (byte === 0) return true;
    }
    return false;
}

function stripComments(content, ext) {
    if (ext === '.json') {
        return content;
    }

    if (ext === '.html' || ext === '.htm') {
        return content
            .replace(/<!--([\s\S]*?)-->/g, '')
            .replace(/<script\b[\s\S]*?<\/script>/gi, block => block)
            .replace(/<style\b[\s\S]*?<\/style>/gi, block => block);
    }

    return content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function countRelevantLines(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) {
        return null;
    }

    const buffer = fs.readFileSync(filePath);
    if (isLikelyBinary(buffer)) {
        return null;
    }

    const content = buffer.toString('utf8');
    const stripped = stripComments(content, ext);
    const lines = stripped.split(/\r?\n/);

    let count = 0;
    for (const line of lines) {
        if (line.trim()) count += 1;
    }
    return count;
}

const files = SOURCE_ROOTS.flatMap(root => walk(path.join(ROOT, root)));

const rows = [];
let total = 0;
let skipped = 0;

for (const file of files) {
    const count = countRelevantLines(file);
    if (count === null) {
        skipped += 1;
        continue;
    }
    total += count;
    rows.push({ file: path.relative(ROOT, file), count });
}

rows.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

for (const row of rows) {
    console.log(`${String(row.count).padStart(6)}  ${row.file}`);
}

console.log('');
console.log(`total: ${total}`);
console.log(`counted files: ${rows.length}`);
console.log(`skipped files: ${skipped}`);
