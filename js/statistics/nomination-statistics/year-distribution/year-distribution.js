import { matchesSearchText, requireElement } from '../distribution-data.js';
import { startDistributionPage } from '../distribution-page.js';
import { fillCharacterList, openDistributionModal } from '../distribution-modal.js';

const SEASON_BY_MONTH = {
    1: 'winter',
    4: 'spring',
    7: 'summer',
    10: 'autumn'
};

const SEASON_LABELS = {
    winter: '冬季',
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    total: '全部'
};

const SEASON_COLUMNS = {
    winter: 1,
    spring: 2,
    summer: 3,
    autumn: 4
};

function hasKnownYearSeason(character) {
    return Number.isInteger(character?.ip_year)
        && character.ip_year > 0
        && Object.prototype.hasOwnProperty.call(SEASON_BY_MONTH, character.ip_season);
}

function seasonKeyOf(character) {
    if (!hasKnownYearSeason(character)) {
        throw new Error(`年份分布季节无效：${character?.ip_season}（${character?.participantId || character?.characterId || character?.name}）`);
    }
    return SEASON_BY_MONTH[character.ip_season];
}

function getYearStats(characters) {
    const yearMap = new Map();
    let total = 0;

    characters.forEach(character => {
        if (!hasKnownYearSeason(character)) return;
        total += 1;
        const season = seasonKeyOf(character);
        let row = yearMap.get(character.ip_year);
        if (!row) {
            row = {
                year: character.ip_year,
                winter: 0,
                spring: 0,
                summer: 0,
                autumn: 0,
                total: 0
            };
            yearMap.set(character.ip_year, row);
        }
        row[season] += 1;
        row.total += 1;
    });

    if (total === 0) return [];
    return Array.from(yearMap.values()).map(row => ({
        ...row,
        percentage: `${((row.total / total) * 100).toFixed(1)}%`
    }));
}

function matchRow(item, query, { characters }) {
    if (matchesSearchText(item.year, query)) return {};
    const character = characters.find(entry => (
        hasKnownYearSeason(entry) && entry.ip_year === item.year && matchesSearchText(entry.name, query)
    ));
    if (!character) return null;
    const season = seasonKeyOf(character);
    const column = SEASON_COLUMNS[season];
    if (!Number.isInteger(column)) {
        throw new Error(`年份分布季节列无效：${season}`);
    }
    return { cells: [0, column] };
}

function renderDetails({ item, detailKey, characters, modal }) {
    if (!Object.prototype.hasOwnProperty.call(SEASON_LABELS, detailKey)) {
        throw new Error(`年份详情键无效：${detailKey}`);
    }
    const title = requireElement('#modalTitle', modal);
    const list = requireElement('#characterList', modal);
    const seasonCharacters = characters.filter(character => (
        hasKnownYearSeason(character)
        && character.ip_year === item.year
        && (detailKey === 'total' || seasonKeyOf(character) === detailKey)
    ));
    title.textContent = `${item.year}年${SEASON_LABELS[detailKey]}角色列表`;
    fillCharacterList(list, seasonCharacters, { showIp: true, showCv: true });
    openDistributionModal(modal);
}

document.addEventListener('DOMContentLoaded', () => {
    void startDistributionPage({
        tableSelector: '#yearTable',
        rowTemplateId: 'year-row-template',
        closeSelector: '.year-close-btn',
        textColumns: [],
        getRowKey: item => item.year,
        getCellValues: item => [item.year, item.winter, item.spring, item.summer, item.autumn, item.total, item.percentage],
        getDetailTargets: item => [
            { key: 'winter', index: 1, count: item.winter },
            { key: 'spring', index: 2, count: item.spring },
            { key: 'summer', index: 3, count: item.summer },
            { key: 'autumn', index: 4, count: item.autumn },
            { key: 'total', index: 5, count: item.total }
        ],
        aggregate: getYearStats,
        matchRow,
        renderDetails
    }).catch(error => {
        console.error('年份分布页初始化失败：', error);
        throw error;
    });
});
