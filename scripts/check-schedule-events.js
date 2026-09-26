#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const EVENTS_PATH = path.join(ROOT, 'data', 'config', 'events.json');

async function readJson(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        throw new Error(`${path.relative(ROOT, filePath)} 包含 BOM，请保存为 UTF-8 无 BOM`);
    }
    return JSON.parse(content);
}

function requireDateRange(event, label) {
    if (!event.dateRange?.start || !event.dateRange?.end) {
        throw new Error(`${label} 缺少 dateRange.start/end`);
    }
}

function collectEventTitles(events) {
    const titles = [];
    Object.entries(events.months || {}).forEach(([monthKey, month]) => {
        (month.events || []).forEach((event, eventIndex) => {
            const label = `events.json ${monthKey}.events[${eventIndex}]`;
            requireDateRange(event, label);
            if (!Array.isArray(event.matches) || event.matches.length === 0) {
                throw new Error(`${label} 缺少 matches`);
            }
            event.matches.forEach((match, matchIndex) => {
                if (!match?.title) {
                    throw new Error(`${label}.matches[${matchIndex}] 缺少 title`);
                }
                if (!match.phase) {
                    throw new Error(`${label}.matches[${matchIndex}] 缺少 phase`);
                }
                titles.push(match.title);
            });
        });
    });
    return titles;
}

async function main() {
    const [{ collectEventWindows, buildScheduleView }, events] = await Promise.all([
        import(pathToFileURL(path.join(ROOT, 'js', 'common', 'schedule-view.js')).href),
        readJson(EVENTS_PATH)
    ]);

    const titles = collectEventTitles(events);
    const duplicateTitles = titles.filter((title, index, list) => list.indexOf(title) !== index);
    if (duplicateTitles.length) {
        throw new Error(`events.json 存在重复赛事：${[...new Set(duplicateTitles)].join('、')}`);
    }

    const windows = collectEventWindows(events);
    const view = buildScheduleView(events);
    const derivedCount = Object.values(view.phases).reduce((count, phase) => count + phase.matches.length, 0);

    console.log(`events.json 时间窗口: ${windows.length}`);
    console.log(`events.json 赛事项: ${titles.length}`);
    console.log(`合成日程赛事: ${derivedCount}`);
    Object.entries(view.phases).forEach(([phaseId, phase]) => {
        console.log(`- ${phase.title} (${phaseId}): ${phase.matches.length}`);
    });
    console.log('\n检查通过：events.json 可独立生成完整赛事日程。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
