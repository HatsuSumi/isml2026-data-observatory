import { loadBattleData, loadContestData, loadNecklaceData, loadPreliminariesData } from './data-loader.js';
import { NOMINATION_TABLE_CONFIGS } from '../table/nomination-table-config.js';

const FORMATS = new Set(['nomination', 'preliminary', 'battle', 'wildcard', 'necklace']);

export function getEventFormat(config) {
    const format = config?.format || (config?.visualizationId && NOMINATION_TABLE_CONFIGS[config.visualizationId] ? 'nomination' : null);
    if (!FORMATS.has(format)) {
        throw new Error(`赛事赛制类型缺失或不支持：${config?.id || ''} (${format || ''})`);
    }
    return format;
}

export function getLinkedId(link) {
    return new URL(link, 'https://isml.invalid/').searchParams.get('id');
}

export function findEventConfig(eventsConfig, id) {
    for (const month of Object.values(eventsConfig.months || {})) {
        for (const event of month.events || []) {
            const match = (event.matches || []).find(item => item.id === id
                || ['visualization', 'table'].some(key => item.links?.[key] && getLinkedId(item.links[key]) === id));
            if (match) return {
                ...match,
                visualizationId: match.links?.visualization ? getLinkedId(match.links.visualization) : null,
                details: { ...event.details, ...match.details },
                dateRange: event.dateRange,
                stats: event.stats || null
            };
        }
    }
    return null;
}

const DATA_LOADERS = {
    nomination: async config => {
        const nominationConfig = NOMINATION_TABLE_CONFIGS[config.visualizationId];
        const dataPath = config.links.data || (nominationConfig ? `${nominationConfig.dataBasePath}.json` : null);
        if (!dataPath) throw new Error(`提名赛事缺少数据路径：${config.id}`);
        const response = await fetch(dataPath);
        if (!response.ok) throw new Error(`数据加载失败：${dataPath}`);
        return response.json();
    },
    preliminary: config => loadPreliminariesData(config.links.data, config.links.internalData || config.links.data),
    battle: config => config.links.internalData
        ? loadContestData(config.links.data, config.links.internalData)
        : loadBattleData(config.links.data),
    wildcard: config => config.links.internalData
        ? loadContestData(config.links.data, config.links.internalData)
        : loadBattleData(config.links.data),
    necklace: config => loadNecklaceData(config.links.data, config.links.internalData || config.links.data)
};

export async function loadFormattedEventData(config) {
    const format = getEventFormat(config);
    if (format !== 'nomination' && !config.links?.data) throw new Error(`赛事缺少数据链接：${config.id}`);
    const data = await DATA_LOADERS[format](config);
    if (!data) throw new Error(`赛事数据不符合 ${format} 赛制：${config.id}`);
    return data;
}
