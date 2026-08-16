import { CONFIG, LAYOUT_CLASSES, SELECTORS } from '../../../common/config.js';

const validVotes = character => character.votes === '-' ? 0 : parseInt(character.votes);

const renderCharacterList = (group, totalVotes) => group.map(character => `
    <div class="${LAYOUT_CLASSES.card}">
        ${character.avatar ? `<img src="${character.avatar}" alt="${character.name}" class="${LAYOUT_CLASSES.characterAvatar}">` : ''}
        <div class="${LAYOUT_CLASSES.characterInfo}">
            <div class="${LAYOUT_CLASSES.characterName}">${character.name}</div>
            <div class="${LAYOUT_CLASSES.characterVotes}">${character.votes === '-' ? '自动晋级' : `${character.votes}票 (${((validVotes(character) / totalVotes) * 100).toFixed(1)}%)`}</div>
        </div>
    </div>
`).join('');

const renderGroupCard = (group, index, comparison, totalVotes, summary) => {
    const metric = comparison.total ?? comparison.avg ?? 0;
    const label = comparison.total !== undefined ? `组总票数：${metric}票` : `组平均票数：${Number(metric).toFixed(1)}票`;
    const diff = comparison.diff ?? comparison.baseDiff;
    const diffClass = diff === 0 ? LAYOUT_CLASSES.tie : diff > 0 ? LAYOUT_CLASSES.leading : LAYOUT_CLASSES.behind;
    const diffText = diff === null || diff === undefined ? '-' : `${diff > 0 ? '+' : ''}${Number(diff).toFixed(diff % 1 ? 1 : 0)}票`;

    return `
        <div class="${LAYOUT_CLASSES.groupCard}">
            <div class="${LAYOUT_CLASSES.rankNumber}">${summary ?? `第 ${comparison.rank ?? index + 1} 名`}</div>
            <div class="${comparison.total !== undefined ? LAYOUT_CLASSES.groupTotalVotes : LAYOUT_CLASSES.groupAvgVotes}">
                <div class="${LAYOUT_CLASSES.voteCount}">${label}</div>
                <div class="${LAYOUT_CLASSES.voteRate}">${comparison.voteRate ?? 0}%</div>
            </div>
            <div class="${LAYOUT_CLASSES.groupCharacterList}">${renderCharacterList(group, totalVotes)}</div>
            <div class="${LAYOUT_CLASSES.voteDiff}">
                <div class="${LAYOUT_CLASSES.diffLabel} ${diffClass}">${index === 0 ? '基准组' : '与基准组差距'}</div>
                <div class="${LAYOUT_CLASSES.diffValue} ${diffClass}">${index === 0 ? '-' : diffText}</div>
                <div class="${LAYOUT_CLASSES.diffRate} ${diffClass}">${index === 0 ? '-' : `${comparison.rateDiff ?? 0}%`}</div>
            </div>
        </div>
    `;
};

export class GroupResultRenderer {
    static setGroupLayout(container, groups) {
        if (groups.length === CONFIG.comparison.groupCompareMinGroups) {
            container.classList.add(LAYOUT_CLASSES.twoGroups);
        }
    }

    static createResult(templateId, groups, comparisons, totalVotes, labels = []) {
        const template = document.getElementById(templateId);
        if (!template) return document.createDocumentFragment();
        const content = template.content.cloneNode(true);
        const container = content.querySelector(SELECTORS.groupComparison);
        container.replaceChildren();
        this.setGroupLayout(container, groups);
        groups.forEach((group, index) => {
            const card = renderGroupCard(group, index, comparisons[index], totalVotes, labels[index]);
            container.insertAdjacentHTML('beforeend', card);
        });
        return content;
    }

    static generateGroupTotalHTML(groups, comparisons, totalVotes) {
        return this.createResult(LAYOUT_CLASSES.groupTotalTemplate, groups, comparisons, totalVotes);
    }

    static generateGroupBaseTotalHTML(groups, comparisons, totalVotes) {
        return this.createResult(
            LAYOUT_CLASSES.groupBaseTotalTemplate,
            groups,
            comparisons,
            totalVotes,
            groups.map((_, index) => index === 0 ? '基准组' : `对比组${index}`)
        );
    }

    static generateGroupBaseAvgHTML(groups, comparisons, totalVotes) {
        return this.createResult(
            LAYOUT_CLASSES.groupBaseAvgTemplate,
            groups,
            comparisons,
            totalVotes,
            groups.map((_, index) => index === 0 ? '基准组' : `对比组${index}`)
        );
    }

    static generateGroupAvgHTML(groups, comparisons, totalVotes) {
        return this.createResult(LAYOUT_CLASSES.groupAvgTemplate, groups, comparisons, totalVotes);
    }
}
