#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHARACTER_PATH = path.join(ROOT, 'characters-data.json');
const IP_PATH = path.join(ROOT, 'ip-data.json');
const TARGETS = [
    'data/characters/stats/ISML2026-characters.json',
    'data/characters/stats/characters-data.json',
    'data/preliminaries/stellar/female/11-preliminary-r01-stellar-female.json'
];

function key(name, ip) {
    return `${String(name || '').trim()}@${String(ip || '').trim()}`;
}

function getCv(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(' / ');
    return typeof value === 'string' ? value.trim() : '';
}

function collectCharacters(value, result = []) {
    if (Array.isArray(value)) {
        value.forEach(item => collectCharacters(item, result));
        return result;
    }
    if (!value || typeof value !== 'object') return result;
    if (value.name && (value.ip_id || value.ip)) result.push(value);
    Object.values(value).forEach(item => collectCharacters(item, result));
    return result;
}

function buildSourceIndex(characters, ips) {
    const ipNames = new Map(Object.values(ips).map(ip => [ip.id, ip.name]));
    return new Map(Object.values(characters)
        .filter(character => getCv(character.cv) && character.name && ipNames.has(character.ip_id))
        .map(character => [key(character.name, ipNames.get(character.ip_id)), getCv(character.cv)]));
}

function updateValue(value, sourceIndex, stats) {
    if (Array.isArray(value)) {
        value.forEach(item => updateValue(item, sourceIndex, stats));
        return;
    }
    if (!value || typeof value !== 'object') return;
    if (value.name && value.ip) {
        const cv = sourceIndex.get(key(value.name, value.ip));
        if (cv && value.cv !== cv) {
            value.cv = cv;
            stats.updated += 1;
        }
        if (!cv) stats.unmatched += 1;
    }
    Object.values(value).forEach(item => updateValue(item, sourceIndex, stats));
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
    const [characters, ips] = await Promise.all([readJson(CHARACTER_PATH), readJson(IP_PATH)]);
    const sourceIndex = buildSourceIndex(characters, ips);
    const results = [];

    for (const relativePath of TARGETS) {
        const filePath = path.join(ROOT, relativePath);
        const data = await readJson(filePath);
        const stats = { updated: 0, unmatched: 0 };
        updateValue(data, sourceIndex, stats);
        results.push({ relativePath, data, stats });
    }

    await Promise.all(results.map(result =>
        fs.writeFile(path.join(ROOT, result.relativePath), `${JSON.stringify(result.data, null, 4)}\n`, 'utf8')));
    results.forEach(result => console.log(`${result.relativePath}: 更新 ${result.stats.updated} 条，未匹配 ${result.stats.unmatched} 条`));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
