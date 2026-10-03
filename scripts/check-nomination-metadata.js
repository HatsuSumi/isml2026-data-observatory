#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

const paths = {
    nominationStats: path.join(rootDir, 'data/statistics/nomination-stats.json'),
    characters: path.join(rootDir, '.cache/characters-data.json'),
    ips: path.join(rootDir, '.cache/ip-data.json'),
    participantMap: path.join(rootDir, 'data/characters/participant-map.json')
};

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isMissingCv(cv) {
    return !String(cv || '').trim();
}

function getCharacterDisplay(character, ip) {
    const cv = Array.isArray(character.cv)
        ? character.cv.filter(Boolean).join('、')
        : character.cv && typeof character.cv === 'object'
            ? Object.values(character.cv).flat().filter(Boolean).join('、')
            : String(character.cv ?? '').trim();
    return {
        name: character.name,
        ip: ip.name,
        ipId: ip.id,
        cv,
        ip_year: Number.isInteger(ip.year) ? ip.year : Number(ip.year) || 0,
        ip_season: Number.isInteger(ip.season) ? ip.season : Number(ip.season) || 0
    };
}

function isMissingNumber(value) {
    return !Number.isInteger(value) || value <= 0;
}

function collectNominationRows(stats) {
    return [
        ['stellar', 'female'],
        ['stellar', 'male'],
        ['nova.winter', 'female'],
        ['nova.winter', 'male']
    ].flatMap(([group, gender]) => {
        const source = group === 'stellar' ? stats.stellar : stats.nova.winter;
        return (source?.[gender] || []).map(record => ({ ...record, group, gender }));
    });
}

function addMissing(list, record, character, ip, reason) {
    list.push({
        participantId: record.participantId,
        name: character?.name || '',
        ip: character?.ip || ip?.name || '',
        group: record.group,
        gender: record.gender,
        reason
    });
}

function printSection(title, records) {
    console.log(`\n${title}（${records.length}个）`);
    if (records.length === 0) {
        console.log('无');
        return;
    }
    records.forEach(record => {
        console.log(`${record.participantId}\t${record.name}\t${record.ip}\t${record.group}\t${record.gender}`);
    });
}

function addMissingIp(list, character, ip, record) {
    const existing = list.find(item => item.ipId === ip.id);
    if (existing) {
        existing.count += 1;
        existing.participantIds.push(record.participantId);
        return;
    }
    list.push({
        ipId: ip.id,
        ip: ip.name,
        count: 1,
        participantIds: [record.participantId]
    });
}

function printIpSection(title, records) {
    console.log(`\n${title}（${records.length}个IP）`);
    if (records.length === 0) {
        console.log('无');
        return;
    }
    records
        .sort((a, b) => b.count - a.count || a.ip.localeCompare(b.ip, 'zh-CN'))
        .forEach(record => {
            console.log(`${record.ipId}\t${record.ip}\t影响角色：${record.count}\t${record.participantIds.join(', ')}`);
        });
}

async function main() {
    const stats = readJson(paths.nominationStats);
    const participantMap = readJson(paths.participantMap);
    const characters = readJson(paths.characters);
    const ips = readJson(paths.ips);
    const charactersById = new Map(Object.values(characters).map(character => [character.id, character]));
    const ipsById = new Map(Object.values(ips).map(ip => [ip.id, ip]));
    const rows = collectNominationRows(stats);
    const missingCv = [];
    const missingYear = [];
    const missingSeason = [];
    const missingYearIps = [];
    const missingSeasonIps = [];

    rows.forEach(record => {
        const characterRecord = charactersById.get(participantMap[record.participantId]);
        const ipRecord = ipsById.get(characterRecord?.ip_id);
        if (!characterRecord) throw new Error(`找不到角色数据：${record.participantId}`);
        if (!ipRecord) throw new Error(`找不到作品数据：${record.participantId}`);
        const character = getCharacterDisplay(characterRecord, ipRecord);
        if (isMissingCv(character.cv)) addMissing(missingCv, record, character, character, 'cv');
        if (isMissingNumber(character.ip_year)) addMissingIp(missingYearIps, character, ipRecord, record);
        if (isMissingNumber(character.ip_season)) addMissingIp(missingSeasonIps, character, ipRecord, record);
    });

    console.log('2026赛季提名角色数据检查');
    console.log('================================');
    console.log(`角色总数：${rows.length}`);
    console.log(`声优缺失：${missingCv.length}`);
    console.log(`IP年份缺失：${missingYearIps.length}个IP`);
    console.log(`IP季度缺失：${missingSeasonIps.length}个IP`);

    printSection('声优缺失角色', missingCv);
    printIpSection('IP年份缺失', missingYearIps);
    printIpSection('IP季度缺失', missingSeasonIps);
}

try {
    await main();
} catch (error) {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
}
