import { CONFIG, LAYOUT_CLASSES, SELECTORS } from '../../../common/config.js';

const value = (number, suffix = '') => `${number}${suffix}`;

const characterCard = (character, content, showDelete = true) => `
    <div class="${LAYOUT_CLASSES.charInfoCard}">
        ${showDelete ? `<button class="${LAYOUT_CLASSES.deleteBtn}" type="button"><i class="fas fa-times"></i></button>` : ''}
        ${character.avatar ? `<img src="${character.avatar}" alt="${character.name}">` : ''}
        <div class="${LAYOUT_CLASSES.infoContent}">
            <h3>${character.name}</h3>
            <p>IP：${character.ip}</p>
            ${character.cv ? `<p>CV：${character.cv}</p>` : ''}
            ${content}
        </div>
    </div>
`;

const voteDifference = comparison => {
    if (!comparison || comparison.voteDiff === null || comparison.voteDiff === undefined) {
        return '';
    }
    if (comparison.voteDiff === 0) {
        return `<span class="${LAYOUT_CLASSES.voteDifference} ${LAYOUT_CLASSES.tie}">平票</span>`;
    }
    const isLeading = comparison.voteDiff > 0;
    return `<span class="${LAYOUT_CLASSES.voteDifference} ${differenceClass(comparison.voteDiff, LAYOUT_CLASSES.voteDifference)}">${isLeading ? '领先' : '落后'}${Math.abs(comparison.voteDiff)}票</span>`;
};

const voteContent = (character, comparison = null) => {
    const isAuto = character.votes === '-';
    return `
        <div class="${LAYOUT_CLASSES.voteInfo}">
            <span class="${LAYOUT_CLASSES.voteLabel}">票数：</span>
            ${isAuto ? `<span class="${LAYOUT_CLASSES.autoTag}">自动晋级</span>` : `<span class="${LAYOUT_CLASSES.voteCount}">${value(character.votes, '票')}</span>${voteDifference(comparison)}`}
        </div>
    `;
};

const differenceClass = (diff, differenceClassName) => {
    if (diff === 0) {
        return `${differenceClassName} ${LAYOUT_CLASSES.tie}`;
    }
    return `${differenceClassName} ${diff > 0 ? LAYOUT_CLASSES.leading : LAYOUT_CLASSES.behind}`;
};

const comparisonText = (diff, positiveLabel, negativeLabel, equalLabel, suffix, differenceClassName) => {
    if (diff === null || diff === undefined) {
        return '';
    }
    if (diff === 0) {
        return `<span class="${differenceClass(diff, differenceClassName)}">${equalLabel}</span>`;
    }
    return `<span class="${differenceClass(diff, differenceClassName)}">${diff > 0 ? positiveLabel : negativeLabel}${Math.abs(diff)}${suffix}</span>`;
};

export class CharacterResultRenderer {
    static generateAvgCompareHTML(characters, avgVotes, comparisons, totalVotes, allCharacters) {
        const ranked = [...allCharacters]
            .filter(character => character.votes !== '-')
            .sort((a, b) => parseInt(b.votes) - parseInt(a.votes));
        const ranks = new Map();
        ranked.forEach((character, index) => {
            const votes = parseInt(character.votes);
            if (!ranks.has(votes)) ranks.set(votes, index + 1);
        });

        return `<div class="${LAYOUT_CLASSES.basicInfo}">${characters.map((character, index) => {
            const comparison = comparisons[index];
            const rank = character.votes === '-' ? '-' : ranks.get(parseInt(character.votes));
            const details = `${voteContent(character, comparison)}${character.votes !== '-' ? `
                <div class="${LAYOUT_CLASSES.voteRate}">
                    <span class="${LAYOUT_CLASSES.rateLabel}">得票率：</span>
                    <span class="${LAYOUT_CLASSES.rateValue}">${comparison.voteRate}%</span>
                </div>
                <div class="${LAYOUT_CLASSES.rankInfo}">
                    <span class="${LAYOUT_CLASSES.rankLabel}">当前排名：</span>
                    <span class="${LAYOUT_CLASSES.rankValue}">${rank}</span>
                </div>` : ''}`;
            return characterCard(character, details, characters.length > CONFIG.comparison.minAvgCharacters);
        }).join('')}</div>`;
    }

    static generateOneToManyHTML(baseCharacter, compareCharacters, comparisons, totalVotes) {
        const cards = [baseCharacter, ...compareCharacters];
        const content = cards.map((character, index) => {
            const comparison = index === 0 ? null : comparisons[index - 1];
            const rate = character.votes === '-' ? null : ((parseInt(character.votes) / totalVotes) * 100).toFixed(1);
            return characterCard(character, `${voteContent(character, comparison)}${rate === null ? '' : `
                <div class="${LAYOUT_CLASSES.voteRate}"><span class="${LAYOUT_CLASSES.rateLabel}">得票率：</span><span class="${LAYOUT_CLASSES.rateValue}">${rate}%</span></div>
                <div class="${LAYOUT_CLASSES.rankInfo}"><span class="${LAYOUT_CLASSES.rankLabel}">当前排名：</span><span class="${LAYOUT_CLASSES.rankValue}">${character.rank}</span></div>`}`);
        }).join('');
        const twoCharsClass = compareCharacters.length === CONFIG.comparison.twoCharactersCount ? LAYOUT_CLASSES.twoChars : '';
        return `<div class="${LAYOUT_CLASSES.basicInfo} ${LAYOUT_CLASSES.oneToMany} ${twoCharsClass}">${content}</div>`;
    }

    static generateOneToOneHTML(characters, hasMultipleNormal) {
        return `<div class="${LAYOUT_CLASSES.basicInfo} ${LAYOUT_CLASSES.twoChars}">${characters.map(character => {
            const comparison = hasMultipleNormal ? character : null;
            const rateDifference = comparisonText(
                comparison?.rateDiff,
                '高',
                '低',
                '相同',
                '个百分点',
                LAYOUT_CLASSES.rateDifference
            );
            const rankDifference = comparisonText(
                comparison?.rankDiff,
                '领先',
                '落后',
                '排名相同',
                '名',
                LAYOUT_CLASSES.rankDifference
            );
            const details = `${voteContent(character, comparison)}${character.votes === '-' ? '' : `
                <div class="${LAYOUT_CLASSES.voteRate}">
                    <span class="${LAYOUT_CLASSES.rateLabel}">得票率：</span>
                    <span class="${LAYOUT_CLASSES.rateValue}">${character.voteRate}%${rateDifference ? `　${rateDifference}` : ''}</span>
                </div>
                <div class="${LAYOUT_CLASSES.rankInfo}">
                    <span class="${LAYOUT_CLASSES.rankLabel}">当前排名：</span>
                    <span class="${LAYOUT_CLASSES.rankValue}">${character.rank}${rankDifference ? `　${rankDifference}` : ''}</span>
                </div>`}`;
            return characterCard(character, details, false);
        }).join('')}</div>`;
    }
}
