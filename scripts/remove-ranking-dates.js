#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE_PATH = path.join(ROOT, 'data', 'votes', 'top5-rankings.json');

async function main() {
    const data = JSON.parse(await fs.readFile(FILE_PATH, 'utf8'));
    let removedCount = 0;

    for (const [title, ranking] of Object.entries(data)) {
        if (!ranking || typeof ranking !== 'object' || !Array.isArray(ranking.top5)) {
            throw new Error(`排名数据格式错误：${title}`);
        }

        if (Object.hasOwn(ranking, 'date')) {
            delete ranking.date;
            removedCount += 1;
        }
    }

    await fs.writeFile(FILE_PATH, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
    console.log(`已更新: ${path.relative(ROOT, FILE_PATH)}`);
    console.log(`处理赛事数: ${Object.keys(data).length}`);
    console.log(`删除 date 字段: ${removedCount} 个`);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
