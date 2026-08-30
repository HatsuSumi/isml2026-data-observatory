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
    return {
        date: rawData.date || '',
        event: rawData.event || '',
        labels: rows.map((item) => `${item.name}（${item.ip}）`).reverse(),
        ranks: rows.map((item) => item.displayRank).reverse(),
        advanceData: rows.map((item) => item.isPromoted ? item.votes : null).reverse(),
        eliminateData: rows.map((item) => item.isPromoted ? null : item.votes).reverse()
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

export function getVisualizationStrategy(visualizationId) {
    const nominationConfig = NOMINATION_TABLE_CONFIGS[visualizationId];
    if (nominationConfig) return createNominationStrategy(nominationConfig);
    if (visualizationId.startsWith('preliminary-') || visualizationId.endsWith('-preliminaries')) return preliminaryStrategy;
    throw new Error(`未找到可视化策略：${visualizationId}`);
}
