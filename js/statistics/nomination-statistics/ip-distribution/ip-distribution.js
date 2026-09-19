import { canonicalSeriesName, getSeriesNames } from '../../../aliases/aliases.js';
import { compareNominationVotes, matchesSearchText, requireElement } from '../distribution-data.js';
import { startDistributionPage } from '../distribution-page.js';
import { fillCharacterList, openDistributionModal } from '../distribution-modal.js';

function belongsToIp(character, ip) {
    return canonicalSeriesName(character.ip) === canonicalSeriesName(ip);
}

function getIPStats(characters) {
    const ipMap = new Map();

    characters.forEach(character => {
        const ip = canonicalSeriesName(character.ip);
        let row = ipMap.get(ip);
        if (!row) {
            row = { name: ip, female: 0, male: 0, total: 0 };
            ipMap.set(ip, row);
        }
        row[character.gender] += 1;
        row.total += 1;
    });

    const total = characters.length;
    if (total === 0) return [];
    return Array.from(ipMap.values()).map(row => ({
        ...row,
        percentage: `${((row.total / total) * 100).toFixed(1)}%`
    }));
}

function matchRow(item, query, { characters }) {
    if (getSeriesNames(item.name).some(name => matchesSearchText(name, query))) {
        return {};
    }
    const character = characters.find(entry => belongsToIp(entry, item.name) && matchesSearchText(entry.name, query));
    if (!character) return null;
    return { cells: [0, character.gender === 'female' ? 1 : 2] };
}

function renderDetails({ item, detailKey, characters, modal }) {
    if (detailKey !== 'female' && detailKey !== 'male' && detailKey !== 'total') {
        throw new Error(`IP详情键无效：${detailKey}`);
    }
    if (detailKey === 'female' && item.female === 0) {
        throw new Error('IP详情打开了空的女性列');
    }
    if (detailKey === 'male' && item.male === 0) {
        throw new Error('IP详情打开了空的男性列');
    }

    const title = requireElement('#modalTitle', modal);
    const femaleList = requireElement('#femaleList', modal);
    const maleList = requireElement('#maleList', modal);
    const lists = requireElement('.ip-character-lists', modal);
    if (!femaleList.parentElement || !maleList.parentElement) {
        throw new Error('IP详情列表缺少父节点');
    }
    const allCharacters = characters.filter(character => belongsToIp(character, item.name));
    const femaleChars = allCharacters.filter(character => character.gender === 'female').sort(compareNominationVotes);
    const maleChars = allCharacters.filter(character => character.gender === 'male').sort(compareNominationVotes);

    title.textContent = item.name;

    if (detailKey === 'total') {
        femaleList.parentElement.style.display = item.female > 0 ? 'block' : 'none';
        maleList.parentElement.style.display = item.male > 0 ? 'block' : 'none';
        lists.style.gridTemplateColumns = item.female > 0 && item.male > 0 ? 'repeat(2, 1fr)' : '1fr';
    } else {
        const showFemale = detailKey === 'female';
        femaleList.parentElement.style.display = showFemale ? 'block' : 'none';
        maleList.parentElement.style.display = showFemale ? 'none' : 'block';
        lists.style.gridTemplateColumns = '1fr';
    }

    fillCharacterList(femaleList, femaleChars, { showCv: true });
    fillCharacterList(maleList, maleChars, { showCv: true });
    openDistributionModal(modal);
}

document.addEventListener('DOMContentLoaded', () => {
    void startDistributionPage({
        tableSelector: '#ipTable',
        rowTemplateId: 'ip-row-template',
        closeSelector: '.ip-close-btn',
        getRowKey: item => item.name,
        getCellValues: item => [item.name, item.female, item.male, item.total, item.percentage],
        getDetailTargets: item => [
            { key: 'female', index: 1, count: item.female },
            { key: 'male', index: 2, count: item.male },
            { key: 'total', index: 3, count: item.total }
        ],
        aggregate: getIPStats,
        matchRow,
        renderDetails
    }).catch(error => {
        console.error('IP分布页初始化失败：', error);
        throw error;
    });
});
