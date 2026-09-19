#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PATHS = {
    events: path.join(ROOT, 'data', 'config', 'events.json'),
    schedule: path.join(ROOT, 'data', 'config', 'schedule.json')
};

async function readJson(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        throw new Error(`${path.relative(ROOT, filePath)} 包含 BOM，请保存为 UTF-8 无 BOM`);
    }
    return JSON.parse(content);
}

function collectScheduleTitles(schedule) {
    const titles = [];
    Object.entries(schedule.phases || {}).forEach(([phaseId, phase]) => {
        (phase.matches || []).forEach((match, index) => {
            if (!match?.title) {
                throw new Error(`schedule.json ${phaseId}.matches[${index}] 缺少 title`);
            }
            if (!match.dateRange?.start || !match.dateRange?.end) {
                throw new Error(`schedule.json ${match.title} 缺少 dateRange.start/end`);
            }
            titles.push({ phaseId, title: match.title, start: match.dateRange.start, end: match.dateRange.end });
        });
    });
    return titles;
}

async function main() {
    const [{ collectEventWindows, buildScheduleView }, events, schedule] = await Promise.all([
        import(pathToFileURL(path.join(ROOT, 'js', 'common', 'schedule-view.js')).href),
        readJson(PATHS.events),
        readJson(PATHS.schedule)
    ]);

    const windows = collectEventWindows(events);
    const occupied = new Set(windows.map(window => window.groupTitle));
    const upcoming = collectScheduleTitles(schedule);
    const overlap = upcoming.filter(item => occupied.has(item.title));
    if (overlap.length) {
        throw new Error(`schedule.json 仍在维护已发生赛事：${overlap.map(item => item.title).join('、')}`);
    }

    const duplicateUpcoming = upcoming
        .map(item => item.title)
        .filter((title, index, list) => list.indexOf(title) !== index);
    if (duplicateUpcoming.length) {
        throw new Error(`schedule.json 存在重复赛事：${[...new Set(duplicateUpcoming)].join('、')}`);
    }

    const view = buildScheduleView(events, schedule);
    const derivedCount = Object.values(view.phases).reduce((count, phase) => count + phase.matches.length, 0);
    console.log(`events.json 时间窗口: ${windows.length}`);
    console.log(`schedule.json 未开赛轮次: ${upcoming.length}`);
    console.log(`合成日程赛事: ${derivedCount}`);
    Object.entries(view.phases).forEach(([phaseId, phase]) => {
        console.log(`- ${phase.title} (${phaseId}): ${phase.matches.length}`);
    });
    console.log('\n检查通过：赛事配置与未开赛日程无重复字段。');
}

main().catch(error => {
    console.error(`检查失败：${error.message}`);
    process.exitCode = 1;
});
