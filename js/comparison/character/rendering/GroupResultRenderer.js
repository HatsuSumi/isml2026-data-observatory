import { CONFIG, LAYOUT_CLASSES, SELECTORS } from '../../../common/config.js';

const cloneTemplate = id => {
    const template = document.getElementById(id);
    if (!template) {
        throw new Error(`找不到分组对比模板: ${id}`);
    }
    return template.content.cloneNode(true).firstElementChild;
};

const validVotes = character => character.votes === '-' ? 0 : parseInt(character.votes, 10);

const renderCharacterList = (container, group, totalVotes) => {
    group.forEach(character => {
        const member = cloneTemplate(LAYOUT_CLASSES.groupResultMemberTemplate);
        const avatar = member.querySelector(`.${LAYOUT_CLASSES.characterAvatar}`);
        const votes = member.querySelector(`.${LAYOUT_CLASSES.characterVotes}`);

        avatar.hidden = !character.avatar;
        if (character.avatar) {
            avatar.src = character.avatar;
            avatar.alt = character.name;
        }

        member.querySelector(`.${LAYOUT_CLASSES.characterName}`).textContent = character.name;
        votes.textContent = character.votes === '-'
            ? '自动晋级'
            : `${character.votes}票 (${totalVotes === 0 ? '0.0' : (validVotes(character) / totalVotes * 100).toFixed(1)}%)`;
        container.append(member);
    });
};

const renderGroupCard = (group, index, comparison, totalVotes, summary, isBaseComparison, baseRelation) => {
    const card = cloneTemplate(LAYOUT_CLASSES.groupResultCardTemplate);
    const metric = comparison.total ?? comparison.avg ?? 0;
    const isTotal = comparison.total !== undefined;
    const diff = comparison.diff ?? comparison.baseDiff;
    const diffClass = diff === 0
        ? LAYOUT_CLASSES.tie
        : diff > 0 ? LAYOUT_CLASSES.leading : LAYOUT_CLASSES.behind;
    const diffText = diff === null || diff === undefined
        ? '-'
        : `${diff > 0 ? '+' : ''}${Number(diff).toFixed(diff % 1 ? 1 : 0)}票`;

    const metricContainer = card.querySelector(`.${LAYOUT_CLASSES.groupTotalVotes}`);
    metricContainer.classList.toggle(LAYOUT_CLASSES.groupTotalVotes, isTotal);
    metricContainer.classList.toggle(LAYOUT_CLASSES.groupAvgVotes, !isTotal);

    card.querySelector(`.${LAYOUT_CLASSES.rankNumber}`).textContent =
        summary ?? `第 ${comparison.rank ?? index + 1} 名`;
    card.querySelector('.metric-label').textContent = isTotal ? '组总票数' : '组平均票数';
    card.querySelector(`.${LAYOUT_CLASSES.voteCount}`).textContent = `${metric}票`;
    const rateLabel = isTotal ? '组内占比' : '相对平均值';
    card.querySelector(`.${LAYOUT_CLASSES.voteRate}`).textContent = `${rateLabel}：${comparison.voteRate ?? 0}%`;

    renderCharacterList(
        card.querySelector(`.${LAYOUT_CLASSES.groupCharacterList}`),
        group,
        totalVotes
    );

    const diffLabel = card.querySelector(`.${LAYOUT_CLASSES.diffLabel}`);
    const diffValue = card.querySelector(`.${LAYOUT_CLASSES.diffValue}`);
    const diffRate = card.querySelector(`.${LAYOUT_CLASSES.diffRate}`);
    if (isBaseComparison && index === 0) {
        const { groupsLeading, groupsBehind } = baseRelation;
        diffLabel.className = LAYOUT_CLASSES.diffLabel;
        diffLabel.replaceChildren();
        const leading = cloneTemplate(LAYOUT_CLASSES.comparisonDifferenceTemplate);
        leading.className = `${LAYOUT_CLASSES.comparisonDifference} ${LAYOUT_CLASSES.leading}`;
        leading.textContent = `领先${groupsBehind}组　`;
        const behind = cloneTemplate(LAYOUT_CLASSES.comparisonDifferenceTemplate);
        behind.className = `${LAYOUT_CLASSES.comparisonDifference} ${LAYOUT_CLASSES.behind}`;
        behind.textContent = `落后${groupsLeading}组`;
        diffLabel.append(leading, behind);
        diffValue.hidden = true;
        diffRate.hidden = true;
    } else {
        const hasNextComparison = comparison.diff !== null && comparison.diff !== undefined;
        const currentDiffClass = hasNextComparison ? diffClass : LAYOUT_CLASSES.tie;
        [diffLabel, diffValue, diffRate].forEach(element => {
            element.className = `${element.className} ${currentDiffClass}`;
        });
        diffLabel.className = `${LAYOUT_CLASSES.diffLabel} ${currentDiffClass}`;
        diffLabel.textContent = isBaseComparison ? '与基准组差距' : '领先下一组';
        diffValue.textContent = isBaseComparison && index === 0 ? '-' : diffText;
        diffRate.textContent = comparison.rateDiff === null || comparison.rateDiff === undefined
            ? '-'
            : `${comparison.rateDiff > 0 ? '+' : ''}${comparison.rateDiff}%`;
    }

    return card;
};

export class GroupResultRenderer {
    static setGroupLayout(container, groups) {
        if (groups.length === CONFIG.comparison.groupCompareMinGroups) {
            container.classList.add(LAYOUT_CLASSES.twoGroups);
        }
    }

    static createResult(templateId, groups, comparisons, totalVotes, labels = []) {
        const content = document.getElementById(templateId)?.content.cloneNode(true);
        if (!content) return document.createDocumentFragment();

        const container = content.querySelector(SELECTORS.groupComparison);
        container.replaceChildren();
        this.setGroupLayout(container, groups);
        const isBaseComparison = templateId === LAYOUT_CLASSES.groupBaseTotalTemplate
            || templateId === LAYOUT_CLASSES.groupBaseAvgTemplate;
        const baseIndex = isBaseComparison
            ? comparisons.findIndex(comparison => comparison.isBase)
            : -1;
        const baseMetric = baseIndex >= 0
            ? comparisons[baseIndex].total ?? comparisons[baseIndex].avg ?? 0
            : 0;
        const baseRelation = isBaseComparison
            ? {
                groupsLeading: comparisons.filter(comparison => (comparison.total ?? comparison.avg ?? 0) > baseMetric).length,
                groupsBehind: comparisons.filter(comparison => (comparison.total ?? comparison.avg ?? 0) < baseMetric).length
            }
            : null;
        groups.forEach((group, index) => {
            container.append(renderGroupCard(
                group,
                index,
                comparisons[index],
                totalVotes,
                labels[index],
                isBaseComparison,
                baseRelation
            ));
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
