import { matchesSearchText, requireElement } from '../distribution-data.js';
import { startDistributionPage } from '../distribution-page.js';
import { fillCharacterList, openDistributionModal } from '../distribution-modal.js';

function getCVStats(characters) {
    const cvMap = new Map();
    let total = 0;

    characters.forEach(character => {
        if (!character.cv) return;
        total += 1;
        let row = cvMap.get(character.cv);
        if (!row) {
            row = {
                name: character.cv,
                female: 0,
                male: 0,
                total: 0,
                characters: []
            };
            cvMap.set(character.cv, row);
        }
        row[character.gender] += 1;
        row.total += 1;
        row.characters.push(character);
    });

    if (total === 0) return [];
    return Array.from(cvMap.values()).map(row => ({
        ...row,
        percentage: `${((row.total / total) * 100).toFixed(2)}%`
    }));
}

function matchRow(item, query) {
    if (!Array.isArray(item.characters)) {
        throw new Error('声优搜索缺少角色列表');
    }
    if (matchesSearchText(item.name, query)) return {};
    const character = item.characters.find(entry => matchesSearchText(entry.name, query));
    if (!character) return null;
    return { cells: [0, character.gender === 'female' ? 1 : 2] };
}

function renderDetails({ item, detailKey, modal }) {
    if (detailKey !== 'female' && detailKey !== 'male' && detailKey !== 'total') {
        throw new Error(`声优详情键无效：${detailKey}`);
    }
    if (!Array.isArray(item.characters)) {
        throw new Error('声优详情缺少角色列表');
    }
    const title = requireElement('#modalTitle', modal);
    const list = requireElement('#characterList', modal);
    const characters = item.characters.filter(character => detailKey === 'total' || character.gender === detailKey);
    const genderLabel = detailKey === 'female' ? '女性' : detailKey === 'male' ? '男性' : '';
    title.textContent = `${item.name} 配音的${genderLabel}角色`;
    fillCharacterList(list, characters, { showIp: true });
    openDistributionModal(modal);
}

document.addEventListener('DOMContentLoaded', () => {
    void startDistributionPage({
        tableSelector: '#cvTable',
        rowTemplateId: 'cv-row-template',
        closeSelector: '.cv-close-btn',
        getRowKey: item => item.name,
        getCellValues: item => [item.name, item.female, item.male, item.total, item.percentage],
        getDetailTargets: item => [
            { key: 'female', index: 1, count: item.female },
            { key: 'male', index: 2, count: item.male },
            { key: 'total', index: 3, count: item.total }
        ],
        aggregate: getCVStats,
        matchRow,
        renderDetails
    }).catch(error => {
        console.error('声优分布页初始化失败：', error);
        throw error;
    });
});
