# JSON 数据重构方案

## 1. 背景与边界

当前项目中，角色基础资料、赛事参赛记录、比赛结果、统计结果和展示配置之间存在字段重复。已经确认 `data/characters/participant-map.json` 可以完整覆盖 400 个 2026 赛事参赛记录到全量角色数据库的映射关系。

本方案的目标是逐步建立清晰的数据职责边界，减少非下载型内部数据的重复字段，降低角色名、IP、头像、CV 等字段不同步的风险，同时保持现有页面和下载文件稳定可用。

## 2. 明确不纳入本轮治理的文件

以下文件后续计划删除或不作为正式数据源，本轮不处理：

```text
data/config/events-data copy.json
characters-data.json
data/characters/stats/ISML2024-characters.json
ip-data.json
```

以下文件是面向用户下载的完整快照数据，需要保留完整角色信息，本轮不改为 ID-only：

```text
data/nomination/**/*.json
```

提名表格、下载按钮、可视化页面仍应继续读取这些完整快照文件。

## 3. 本轮关注文件

核心治理对象：

```text
data/characters/characters-details.json
data/characters/roundsData.json
data/statistics/nomination-stats.json
data/matches/character-matches.json
data/characters/stats/ISML2026-characters.json
data/groups/groups.json
data/votes/top5-rankings.json
data/preliminaries/stellar/**/*.json
data/config/events.json
data/config/schedule.json
```

其中优先级最高的是：

```text
data/characters/characters-details.json
data/characters/roundsData.json
data/statistics/nomination-stats.json
data/matches/character-matches.json
data/characters/stats/ISML2026-characters.json
```

## 4. 目标架构

### 4.1 角色实体

远程全量角色数据库作为角色基础资料源：

```text
https://raw.githubusercontent.com/HatsuSumi/anime-character-database/main/characters-data.json
```

角色基础资料包括：

```text
char_* id
name
name_en
ip_id
cv
avatar
```

项目内不再在内部规范化数据中重复维护这些字段。

### 4.2 赛事参赛实体

本项目维护 2026 赛事参赛记录：

```text
data/characters/participant-map.json
```

职责：

```text
SF* / ESF* / SM* / ESM* -> char_*
```

后续如果需要扩展，可以演进为：

```json
{
    "SF001": {
        "characterId": "char_000639",
        "division": "stellar.female",
        "source": "stellar.nomination"
    }
}
```

当前阶段保持简单映射即可。

### 4.3 内部赛事数据

内部赛事数据只保存赛事事实，不保存角色基础资料。

示例：

```json
{
    "SF001": {
        "rounds": [],
        "status": "已晋级至预选赛"
    }
}
```

比赛结果示例：

```json
{
    "SF001": {
        "matches": [
            {
                "title": "恒星组提名",
                "result": "晋级"
            }
        ]
    }
}
```

统计结果示例：

```json
{
    "SF001": {
        "votes": 244,
        "rank": 1,
        "status": "晋级"
    }
}
```

### 4.4 展示与下载快照

下载型 JSON 可以继续保存完整字段，包括 `name`、`ip`、`cv`、`avatar`、`name_en`。这些文件服务于用户导出和复核，不作为内部基础资料主源。

## 5. 分阶段实施计划

## 阶段 0：冻结现状与建立校验

目标：确保后续迁移可回归、可验证。

步骤：

1. 保留并继续维护 `scripts/check-character-database-match.js`。
2. 保留 `data/characters/participant-map.json`。
3. 增加一个只读校验脚本，例如：

```text
scripts/check-data-duplication.js
```

该脚本负责：

- 校验 `participant-map.json` 覆盖 400 个赛事参赛 ID。
- 校验所有 `char_*` 目标 ID 唯一。
- 校验 `characters-details.json`、`roundsData.json`、`character-matches.json` 的参赛 ID 集合一致。
- 校验 `character-matches.json` 中每个 key 都能在 `participant-map.json` 找到。
- 校验 `groups.json` 和预选赛数据中的角色能映射到参赛 ID 或角色 ID。

验收标准：

```bash
node scripts/check-character-database-match.js
node scripts/check-data-duplication.js
```

两个脚本均通过。

建议提交点：

```text
chore: add data duplication validation
```

## 阶段 1：建立统一角色解析层

目标：先改代码读取方式，不急着删 JSON 字段。

新增模块：

```text
js/common/character-resolver.js
```

职责：

- 加载远程全量角色库。
- 加载 `participant-map.json`。
- 根据参赛 ID 返回完整展示对象。
- 根据 `name + ip` 兼容旧数据查找参赛 ID 或角色基础资料。
- 提供统一的空头像、空 CV、别名兜底策略。

建议 API：

```js
export async function loadCharacterResolver();

resolver.getByParticipantId(participantId);
resolver.getByCharacterId(characterId);
resolver.findByNameIp(name, ip);
resolver.enrichParticipant(participantId, eventFields);
resolver.enrichLegacyRow(row);
```

展示对象建议格式：

```js
{
    participantId: 'SF001',
    characterId: 'char_000639',
    name: '后藤独',
    nameEn: 'Gotō Hitori',
    ipId: 'ip_...',
    ip: '孤独摇滚！',
    cv: '青山吉能',
    avatar: 'https://...',
    ip_year: 2022,
    ip_season: 10,
    event: {}
}
```

注意：如果远程角色库没有 IP 名称而只有 `ip_id`，短期内可以继续使用旧数据中的 `ip` 作为展示兜底。IP 统一治理单独放到后续阶段。

涉及文件：

```text
js/common/data-loader.js
js/character-detail/character-detail-data.js
js/groups/groups.js
js/comparison/data/CharacterRepository.js
```

验收标准：

- 角色详情页正常显示。
- 分组页正常显示头像、姓名、IP。
- 角色对比页正常搜索和选择角色。
- 旧 JSON 字段即使存在，也只作为兼容兜底，不再作为主源。

建议提交点：

```text
refactor: add character resolver for participant mapping
```

## 阶段 2：规范 `character-matches.json`

目标：去掉最明确的重复角色基础字段。

当前问题：

```text
data/matches/character-matches.json
```

同时保存了：

```text
name
ip
avatar
matches
```

其中 `name`、`ip`、`avatar` 属于角色基础资料或展示资料，不应是比赛结果主源。

目标结构：

```json
{
    "matches": {
        "SF001": [
            {
                "title": "恒星组提名",
                "result": "晋级"
            }
        ]
    }
}
```

迁移步骤：

1. 写脚本 `scripts/migrate-character-matches.js`。
2. 读取旧 `character-matches.json`。
3. 对每个参赛 ID 保留 `matches` 数组。
4. 删除 `name`、`ip`、`avatar`。
5. 输出新结构前先生成临时文件：

```text
data/matches/character-matches.next.json
```

6. 修改读取比赛结果的代码，优先支持新结构，同时兼容旧结构。
7. 页面验证通过后替换正式文件。

验收标准：

- 角色详情页比赛记录不变。
- 角色对比页可正常读取赛事记录。
- `character-matches.json` 不再包含 `name`、`ip`、`avatar`。
- 校验脚本确认所有 ID 都存在于 `participant-map.json`。

建议提交点：

```text
refactor: normalize character match records
```

## 阶段 3：拆分 `characters-details.json`

目标：让角色详情文件只保存参赛详情和轮次信息，不再作为基础资料源。

当前问题：

```text
data/characters/characters-details.json
```

每个角色保存：

```text
basic.id
basic.name
basic.ip
basic.avatar
basic.cv
rounds
```

其中 `basic` 大部分字段可通过 `participant-map.json` 和角色库获取。

目标结构一：保守迁移

```json
{
    "config": {},
    "characters": {
        "SF001": {
            "characterId": "char_000639",
            "rounds": []
        }
    }
}
```

目标结构二：更清晰拆分

```text
data/characters/participant-details.json
data/characters/participant-rounds.json
```

推荐采用目标结构一作为第一步，减少页面改动。

迁移步骤：

1. 修改 `loadCharacterDetails()`，返回兼容后的完整展示对象。
2. 增加内部函数 `normalizeCharacterDetails(raw, resolver)`。
3. 在代码层先兼容旧结构和新结构。
4. 写迁移脚本生成 `characters-details.next.json`。
5. 确认页面无差异后替换正式文件。

验收标准：

- 角色详情页、角色分组页、赛事数据页不变。
- `characters-details.json` 中不再重复保存 `name`、`ip`、`avatar`、`cv`。
- `rounds` 数据完整保留。

建议提交点：

```text
refactor: normalize participant details data
```

## 阶段 4：治理 `roundsData.json` 与 `ISML2026-characters.json`

目标：明确二者职责，避免两个文件都保存当前赛事参赛状态和基础资料。

当前问题：

```text
data/characters/roundsData.json
data/characters/stats/ISML2026-characters.json
```

都保存了角色 ID、姓名、IP、头像、CV、状态等字段。

建议职责：

```text
roundsData.json
保存每轮赛事状态、票数、排名、晋级结果。

ISML2026-characters.json
如果仍需要，作为派生构建产物；否则删除或改为由脚本生成。
```

推荐方案：

1. 将 `ISML2026-characters.json` 标记为派生文件。
2. 新增生成脚本：

```text
scripts/build-isml2026-character-stats.js
```

3. 源数据来自：

```text
participant-map.json
characters-details.json
roundsData.json
character-matches.json
```

4. 如果没有页面引用 `ISML2026-characters.json`，则删除该文件。

迁移步骤：

1. 用搜索确认是否存在运行时引用。
2. 若无引用，删除或移到归档目录。
3. 若有引用，改为通过脚本生成，不人工维护。
4. `roundsData.json` 改为 ID-only 结构，只保留赛事字段。

验收标准：

- 当前页面功能不变。
- `ISML2026-characters.json` 不再作为手写主数据源。
- `roundsData.json` 不再重复角色基础资料。

建议提交点：

```text
refactor: make ISML2026 character stats derived
```

## 阶段 5：治理统计与排名文件

目标：统计文件只保存统计结果，展示时通过 resolver 补齐角色资料。

涉及文件：

```text
data/statistics/nomination-stats.json
data/votes/top5-rankings.json
```

`nomination-stats.json` 目标结构：

```json
{
    "stellar": {
        "female": [
            {
                "participantId": "SF001",
                "votes": 244,
                "rank": 1,
                "status": "晋级"
            }
        ]
    }
}
```

作品年份和季节由远端 IP 库通过 resolver 补齐，统计文件不再重复保存 `ip_year` / `ip_season`。IP 库未填写时值为 `0`，年份分布页跳过这些记录。

`top5-rankings.json` 目标结构：

```json
{
    "恒星组提名-女性组别": {
        "top5": [
            {
                "participantId": "SF088",
                "votes": 244
            }
        ]
    }
}
```

迁移步骤：

1. 修改统计页面读取逻辑，支持 `participantId`。
2. `loadNominationStats()` 加入 resolver 补齐展示字段。
3. `loadEventData()` 加入 resolver 补齐 Top5 头像和姓名。
4. 写迁移脚本生成 `.next.json`。
5. 页面验证后替换正式文件。

验收标准：

- 提名统计页显示不变。
- 赛事数据页 Top5 显示不变。
- 统计文件不再重复基础角色资料。

建议提交点：

```text
refactor: normalize nomination statistics data
```

## 阶段 6：治理分组与预选赛数据

目标：不破坏预选赛表格和下载需求，逐步将内部页面改为 ID 驱动。

### 6.1 `groups.json`

当前结构：

```json
{
    "name": "白",
    "ip": "NO GAME NO LIFE 游戏人生"
}
```

目标结构：

```json
{
    "participantId": "SF017"
}
```

如果分组内存在未进入 400 参赛记录的角色，则使用：

```json
{
    "characterId": "char_..."
}
```

迁移步骤：

1. 建立 `name + ip -> participantId` 的反向索引。
2. 自动迁移能唯一匹配的分组成员。
3. 无法匹配的保留旧结构并列入人工确认清单。
4. 分组页渲染逻辑同时兼容新旧结构。

### 6.2 `data/preliminaries/stellar/**/*.json`

这些文件不是用户明确要求保留完整数据的下载源，但当前预选赛表格和下载按钮直接读取它们。因此不建议立即改成 ID-only。

推荐方案：

- 保留当前完整 JSON 作为下载快照。
- 另建内部规范化文件：

```text
data/internal/preliminaries/stellar/female/11-preliminary-r01-stellar-female.json
```

内部文件结构：

```json
{
    "data": [
        {
            "participantId": "SF017",
            "group": "女子1组",
            "rank": 1,
            "global_rank": 3,
            "votes": 2393,
            "is_advanced": true
        }
    ]
}
```

前端页面可以继续读完整快照，直到 resolver 接入稳定后再切换内部数据源。下载按钮仍然指向完整快照。

验收标准：

- 分组页显示不变。
- 预选赛表格显示不变。
- 下载文件仍保留完整字段。

建议提交点：

```text
refactor: normalize group references without changing downloads
```

## 阶段 7：统一赛事配置

目标：减少 `events.json` 和 `schedule.json` 对赛事日期、标题、链接的重复维护。

当前问题：

```text
data/config/events.json
data/config/schedule.json
```

都保存赛事标题、时间、阶段和链接相关信息。

推荐职责：

```text
events.json
唯一赛事业务配置源，保存赛事 ID、标题、阶段、日期、数据路径、规则链接、表格链接、可视化链接。

schedule.json
只保存日程页展示专用布局字段；若字段能从 events.json 推导，则不重复保存。
```

迁移步骤：

1. 确认日程页是否必须读取 `schedule.json`。
2. 若必须读取，写 `scripts/build-schedule.js` 从 `events.json` 生成 `schedule.json`。
3. 将 `schedule.json` 标记为派生文件。
4. 去除 BOM，统一 UTF-8 无 BOM。
5. 增加脚本校验 `events.json` 与 `schedule.json` 的日期和标题一致。

验收标准：

- 赛事数据页显示不变。
- 日程页显示不变。
- `schedule.json` 不再手工维护重复赛事业务字段。

建议提交点：

```text
refactor: derive schedule data from events config
```

## 6. 推荐目录结构

短期：

```text
data/characters/participant-map.json
data/characters/characters-details.json
data/matches/character-matches.json
data/statistics/nomination-stats.json
data/votes/top5-rankings.json
```

中期：

```text
data/participants/participant-map.json
data/participants/details.json
data/participants/rounds.json
data/matches/character-matches.json
data/statistics/nomination-stats.json
data/internal/preliminaries/**/*.json
```

长期：

```text
data/entities/participants.json
data/events/events.json
data/events/round-results.json
data/events/matches.json
data/derived/schedule.json
data/downloads/nomination/**/*.json
data/downloads/preliminaries/**/*.json
```

长期目录重组不建议现在直接做，因为路径变更会影响大量页面和 GitHub Pages 静态资源引用。

## 7. 兼容策略

所有读取层先支持双结构：

1. 如果记录有 `participantId`，使用 resolver 补齐展示字段。
2. 如果记录仍有 `name + ip`，按旧逻辑读取，并尝试通过 resolver 做增强。
3. 如果 resolver 失败，保留旧字段展示，避免页面空白。
4. 只有当页面和校验脚本都通过后，再删除旧字段。

推荐工具函数：

```js
function isParticipantRecord(record) {
    return typeof record?.participantId === 'string';
}

function isLegacyCharacterRecord(record) {
    return record?.name && record?.ip;
}
```

## 8. 脚本清单

建议新增或扩展以下脚本：

```text
scripts/check-character-database-match.js
scripts/check-data-duplication.js
scripts/migrate-character-matches.js
scripts/migrate-character-details.js
scripts/migrate-nomination-stats.js
scripts/migrate-groups.js
scripts/build-isml2026-character-stats.js
scripts/build-schedule.js
```

脚本原则：

- 默认只读检查。
- 写入必须显式传参，例如 `--write` 或 `--write-map`。
- 正式覆盖前先生成 `.next.json`。
- 每个脚本输出记录数量、缺失数量、冲突数量。
- 有冲突时非零退出。

## 9. 回归测试清单

每个阶段至少检查：

```text
首页
赛事数据页
角色详情页
角色数据页
角色对比页
赛事对比页
提名统计页
分组页
提名表格页
预选赛表格页
可视化页
规则页
日程页
```

浏览器重点验证：

- GitHub Pages 子路径部署下资源路径是否正确。
- 角色头像是否显示。
- 角色名、IP、CV 是否缺失。
- 下载按钮是否仍下载完整数据。
- 旧链接是否仍可打开。

命令行检查：

```bash
node --check scripts/check-character-database-match.js
node scripts/check-character-database-match.js
node scripts/check-data-duplication.js
```

如果新增迁移脚本，也要逐个执行 dry-run。

## 10. 推荐实施顺序总结

1. 建校验脚本，冻结现状。
2. 建 `character-resolver`，让代码具备统一解析能力。
3. 先治理 `character-matches.json`。
4. 再治理 `characters-details.json`。
5. 处理 `roundsData.json` 和 `ISML2026-characters.json`。
6. 处理 `nomination-stats.json` 和 `top5-rankings.json`。
7. 处理 `groups.json`。
8. 决定预选赛内部规范化数据是否需要另建 `data/internal`。
9. 最后统一 `events.json` 和 `schedule.json`。

这个顺序的原因是：先建立读取兼容层，再替换数据结构；先处理不面向下载的内部文件，再处理展示和统计文件；最后处理配置模型。这样每一步都可以独立提交、独立回滚，不会一次性破坏多个页面。
