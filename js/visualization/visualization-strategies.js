import { NOMINATION_TABLE_CONFIGS } from '../table/nomination-table-config.js';
import { normalizeNominationVisualizationRows } from '../table/nomination-data.js';

function getRawRows(rawData) {
    if (!Array.isArray(rawData?.data)) {
        throw new Error('可视化数据格式错误：data 必须是数组');
    }

    return rawData.data;
}

function filterRowsByMode(rows, mode) {
    if (mode === 'advance') return rows.filter((item) => item.isPromoted);
    if (mode === 'eliminate') return rows.filter((item) => !item.isPromoted);
    return rows;
}

function buildChartData(rawData, rows) {
    const displayRows = rows.map((item) => ({
        ...item,
        label: `${item.name}（${item.ip}）`,
        group: item.group ?? '全部参赛者'
    }));
    const groups = displayRows.reduce((groupMap, item) => {
        const groupRows = groupMap.get(item.group) || [];
        groupRows.push(item);
        groupMap.set(item.group, groupRows);
        return groupMap;
    }, new Map());

    return {
        date: rawData.date || '',
        event: rawData.event || '',
        labels: displayRows.map((item) => item.label).reverse(),
        ranks: displayRows.map((item) => item.displayRank).reverse(),
        advanceData: displayRows.map((item) => item.isPromoted ? item.votes : null).reverse(),
        eliminateData: displayRows.map((item) => item.isPromoted ? null : item.votes).reverse(),
        groups: [...groups.entries()].map(([name, groupRows]) => ({
            name,
            rows: groupRows
        })),
        statusLabels: {
            advance: '晋级',
            eliminate: '未晋级'
        }
    };
}

function createNominationStrategy(config) {
    return {
        normalize(rawData, mode) {
            const rows = filterRowsByMode(
                normalizeNominationVisualizationRows(config, rawData).map((item) => ({
                    ...item,
                    displayRank: String(item.rank)
                })),
                mode
            );
            return buildChartData(rawData, rows);
        }
    };
}

const preliminaryStrategy = {
    normalize(rawData, mode) {
        const rows = filterRowsByMode(
            getRawRows(rawData)
                .map((item) => ({
                    ...item,
                    votes: Number(item.votes),
                    rank: Number(item.rank),
                    isPromoted: item.is_advanced === true,
                    displayRank: `${item.group}第${item.rank}`
                }))
                .filter((item) => Number.isFinite(item.votes) && item.votes > 0)
                .sort((a, b) => b.votes - a.votes || a.rank - b.rank || a.name.localeCompare(b.name, 'zh-CN')),
            mode
        );
        return buildChartData(rawData, rows);
    }
};

function buildNecklaceChartData(rawData, rows) {
    const rounds = rawData.data.map((round) => `第${round.round}轮`);
    const byId = new Map();
    rows.forEach((item) => {
        if (!byId.has(item.participantId)) byId.set(item.participantId, { ...item, label: `${item.name}（${item.ip}）`, values: Array(rounds.length).fill(null), statuses: Array(rounds.length).fill(null) });
        const entry = byId.get(item.participantId);
        entry.values[item.round - 1] = item.votes;
        entry.statuses[item.round - 1] = item.status;
    });
    const contestants = [...byId.values()].sort((a, b) => a.finalRank - b.finalRank);
    return {
        date: rawData.date || '',
        event: rawData.event || '',
        labels: rounds,
        rounds,
        contestants,
        statusLabels: { advance: '仍在比赛', eliminate: '已淘汰' }
    };
}

const necklaceStrategy = {
    normalize(rawData) {
        const rows = rawData.data.flatMap((round) => round.contestants.map((contestant) => ({
            ...contestant,
            round: Number(round.round),
            finalRank: contestant.finalRank || 0
        })));
        const finalRanks = new Map();
        rawData.data.flatMap((round) => round.contestants).forEach((contestant) => {
            if (contestant.status === 'winner') finalRanks.set(contestant.participantId, 1);
        });
        rows.forEach((item) => {
            if (!finalRanks.has(item.participantId)) finalRanks.set(item.participantId, 9 - item.round);
        });
        rows.forEach((item) => { item.finalRank = finalRanks.get(item.participantId); });
        return buildNecklaceChartData(rawData, rows);
    }
};

const phase1Strategy = {
    normalize(rawData, mode) {
        const rows = filterRowsByMode(rawData.data.flatMap(match => match.contestants.map(contestant => ({
            ...contestant,
            label: `${contestant.name}（${contestant.ip}）`,
            group: `擂台${match.match}`,
            votes: Number(contestant.votes),
            isPromoted: contestant.result === 'win'
        }))), mode)
            .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'zh-CN'))
            .map((item, index) => ({
                ...item,
                rank: index + 1,
                globalRank: index + 1,
                displayRank: `第${index + 1}名`
            }));
        return {
            ...buildChartData(rawData, rows),
            statusLabels: {
                advance: '胜者',
                eliminate: '败者'
            }
        };
    }
};

export function getVisualizationStrategy(visualizationId) {
    const nominationConfig = NOMINATION_TABLE_CONFIGS[visualizationId];
    if (nominationConfig) return createNominationStrategy(nominationConfig);
    if (visualizationId.startsWith('preliminary-') || visualizationId.endsWith('-preliminaries')) return preliminaryStrategy;
    if (visualizationId.startsWith('phase1-r06-necklace-')) return necklaceStrategy;
    if (visualizationId.startsWith('phase1-')) return phase1Strategy;
    throw new Error(`未找到可视化策略：${visualizationId}`);
}
