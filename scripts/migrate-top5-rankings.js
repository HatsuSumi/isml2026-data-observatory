import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHARACTER_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json';
const IP_DATABASE_URL = 'https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/ip-data.json';

const rankingsPath = path.join(rootDir, 'data/votes/top5-rankings.json');
const outputPath = path.join(rootDir, 'data/votes/top5-rankings.next.json');
const participantMapPath = path.join(rootDir, 'data/characters/participant-map.json');
const cacheDir = path.join(rootDir, '.cache');
const charCachePath = path.join(cacheDir, 'characters-data.json');
const ipCachePath = path.join(cacheDir, 'ip-data.json');

// 确保缓存目录存在
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

// 使用 curl 下载文件（Windows 10+ 内置）
async function downloadFile(url, destPath, retries = 3) {
    if (fs.existsSync(destPath)) {
        console.log(`使用缓存: ${path.basename(destPath)}`);
        return;
    }
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`下载: ${url} (尝试 ${i + 1}/${retries})`);
            await execAsync(`curl -L --max-time 30 -o "${destPath}" "${url}"`);
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
                console.log(`✓ 下载成功: ${path.basename(destPath)}`);
                return;
            }
        } catch (err) {
            console.log(`✗ 下载失败: ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

console.log('正在加载角色数据库...');
await downloadFile(CHARACTER_DATABASE_URL, charCachePath);
await downloadFile(IP_DATABASE_URL, ipCachePath);

const charactersDb = JSON.parse(fs.readFileSync(charCachePath, 'utf-8'));
const ipDb = JSON.parse(fs.readFileSync(ipCachePath, 'utf-8'));
const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
const participantMap = JSON.parse(fs.readFileSync(participantMapPath, 'utf-8'));

// 构建 characterId -> character 和 ipId -> ip 映射
const charMap = new Map(Object.entries(charactersDb));
const ipMap = new Map(Object.entries(ipDb));

// 规范化字符串用于匹配（去除标点和空格）
function normalize(str) {
    return str.replace(/[！!？?。.～~・\s]/g, '');
}

// 构建 name+ip -> participantId 索引（精确匹配和模糊匹配）
const nameIpIndex = new Map();
const normalizedIndex = new Map();

for (const [participantId, characterId] of Object.entries(participantMap)) {
    const char = charMap.get(characterId);
    if (!char) continue;
    const ip = ipMap.get(char.ip_id);
    if (!ip) continue;
    
    const key = `${char.name}@${ip.name}`;
    nameIpIndex.set(key, participantId);
    
    const normalizedKey = `${normalize(char.name)}@${normalize(ip.name)}`;
    normalizedIndex.set(normalizedKey, participantId);
}

const result = {};
const warnings = [];

for (const [title, ranking] of Object.entries(rankings)) {
    result[title] = {
        top5: ranking.top5.map((item, index) => {
            const key = `${item.name}@${item.ip}`;
            const participantId = nameIpIndex.get(key) || normalizedIndex.get(`${normalize(item.name)}@${normalize(item.ip)}`);
            
            if (!participantId) {
                warnings.push(`[${title}] 第${index + 1}名未找到: ${item.name} @ ${item.ip}`);
                return {
                    participantId: null,
                    votes: item.votes,
                    _fallback: { name: item.name, ip: item.ip }
                };
            }
            
            return {
                participantId,
                votes: item.votes
            };
        })
    };
}

fs.writeFileSync(outputPath, JSON.stringify(result, null, 4), 'utf-8');

console.log(`✓ 已生成: ${outputPath}`);
console.log(`  总计 ${Object.keys(result).length} 个赛事`);
console.log(`  总计 ${Object.values(result).reduce((sum, r) => sum + r.top5.length, 0)} 条记录`);

if (warnings.length > 0) {
    console.log(`\n⚠ 警告 (${warnings.length}):`);
    warnings.forEach(w => console.log(`  ${w}`));
} else {
    console.log('\n✓ 全部匹配成功');
}
