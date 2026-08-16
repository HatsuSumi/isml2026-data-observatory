import { CONFIG, LAYOUT_CLASSES } from '../../../common/config.js';

const templateElement = id => document.getElementById(id);

const cloneTemplate = id => {
    const template = templateElement(id);
    if (!template) {
        throw new Error(`找不到角色对比模板: ${id}`);
    }
    return template.content.cloneNode(true).firstElementChild;
};

const setText = (element, text) => {
    element.textContent = text ?? '';
};

const setVisible = (element, visible) => {
    element.hidden = !visible;
};

const differenceClass = (diff, className) => {
    if (diff === 0) {
        return `${className} ${LAYOUT_CLASSES.tie}`;
    }
    return `${className} ${diff > 0 ? LAYOUT_CLASSES.leading : LAYOUT_CLASSES.behind}`;
};

const formatVoteDifference = comparison => {
    if (!comparison || comparison.voteDiff === null || comparison.voteDiff === undefined) {
        return null;
    }

    if (comparison.voteDiff === 0) {
        return {
            text: '平票',
            className: `${LAYOUT_CLASSES.voteDifference} ${LAYOUT_CLASSES.tie}`
        };
    }

    return {
        text: `${comparison.voteDiff > 0 ? '领先' : '落后'}${Math.abs(comparison.voteDiff)}票`,
        className: differenceClass(comparison.voteDiff, LAYOUT_CLASSES.voteDifference)
    };
};

const formatComparisonText = (diff, positiveLabel, negativeLabel, equalLabel, suffix, className) => {
    if (diff === null || diff === undefined) {
        return null;
    }

    if (diff === 0) {
        return {
            text: equalLabel,
            className: differenceClass(diff, className)
        };
    }

    return {
        text: `${diff > 0 ? positiveLabel : negativeLabel}${Math.abs(diff)}${suffix}`,
        className: differenceClass(diff, className)
    };
};

const createBasicInfo = classNames => {
    const container = cloneTemplate(LAYOUT_CLASSES.characterResultContainerTemplate);
    container.className = `${LAYOUT_CLASSES.basicInfo} ${classNames}`.trim();
    return container;
};

const createOneToManyLayout = classNames => {
    const container = cloneTemplate(LAYOUT_CLASSES.oneToManyResultTemplate);
    container.className = `${LAYOUT_CLASSES.basicInfo} ${LAYOUT_CLASSES.oneToMany} ${classNames}`.trim();
    return container;
};

const createDifferenceElement = (difference) => {
    if (!difference) {
        return null;
    }

    const element = cloneTemplate(LAYOUT_CLASSES.comparisonDifferenceTemplate);
    element.className = difference.className;
    element.textContent = difference.text;
    return element;
};

const populateCharacterCard = (card, character, comparison, {
    showDelete,
    rate,
    rank,
    rateDifference,
    rankDifference
} = {}) => {
    const avatar = card.querySelector('.character-result-avatar');
    const cv = card.querySelector('.character-cv');
    const autoTag = card.querySelector(`.${LAYOUT_CLASSES.autoTag}`);
    const voteCount = card.querySelector(`.${LAYOUT_CLASSES.voteCount}`);
    const voteDifference = card.querySelector(`.${LAYOUT_CLASSES.voteDifference}`);
    const voteRate = card.querySelector(`.${LAYOUT_CLASSES.voteRate}`);
    const rateValue = card.querySelector(`.${LAYOUT_CLASSES.rateValue}`);
    const rankInfo = card.querySelector(`.${LAYOUT_CLASSES.rankInfo}`);
    const rankValue = card.querySelector(`.${LAYOUT_CLASSES.rankValue}`);
    const deleteButton = card.querySelector(`.${LAYOUT_CLASSES.deleteBtn}`);

    setVisible(deleteButton, showDelete);

    setVisible(avatar, Boolean(character.avatar));
    if (character.avatar) {
        avatar.src = character.avatar;
        avatar.alt = character.name;
    }

    setText(card.querySelector('.character-name'), character.name);
    setText(card.querySelector('.character-ip'), `IP：${character.ip}`);
    setVisible(cv, Boolean(character.cv));
    if (character.cv) {
        setText(cv, `CV：${character.cv}`);
    }

    const isAuto = character.votes === '-';
    setVisible(autoTag, isAuto);
    setVisible(voteCount, !isAuto);
    setVisible(voteDifference, false);
    if (!isAuto) {
        setText(voteCount, `${character.votes}票`);
        const difference = formatVoteDifference(comparison);
        if (difference) {
            setVisible(voteDifference, true);
            voteDifference.className = difference.className;
            setText(voteDifference, difference.text);
        }
    }

    const hasRate = !isAuto && rate !== null && rate !== undefined;
    setVisible(voteRate, isAuto || hasRate);
    if (isAuto) {
        setText(rateValue, '不适用');
    } else if (hasRate) {
        const rateText = `${rate}%`;
        setText(rateValue, rateText);
        if (rateDifference) {
            rateValue.append(document.createTextNode('　'));
            const difference = formatComparisonText(
                rateDifference,
                '高',
                '低',
                '相同',
                '个百分点',
                LAYOUT_CLASSES.rateDifference
            );
            const element = createDifferenceElement(difference);
            if (element) {
                rateValue.append(element);
            }
        }
    }

    const hasRank = !isAuto && rank !== null && rank !== undefined;
    setVisible(rankInfo, isAuto || hasRank);
    if (isAuto) {
        setText(rankValue, '不适用');
    } else if (hasRank) {
        setText(rankValue, String(rank));
        if (rankDifference) {
            rankValue.append(document.createTextNode('　'));
            const difference = formatComparisonText(
                rankDifference,
                '领先',
                '落后',
                '排名相同',
                '名',
                LAYOUT_CLASSES.rankDifference
            );
            const element = createDifferenceElement(difference);
            if (element) {
                rankValue.append(element);
            }
        }
    }

    setVisible(deleteButton, showDelete);
    return card;
};

const createCard = (character, comparison, options) => {
    const card = cloneTemplate(LAYOUT_CLASSES.characterResultCardTemplate);
    return populateCharacterCard(card, character, comparison, options);
};

export class CharacterResultRenderer {
    static generateAvgCompareHTML(characters, avgVotes, comparisons, totalVotes, allCharacters) {
        const ranked = [...allCharacters]
            .filter(character => character.votes !== '-')
            .sort((a, b) => parseInt(b.votes, 10) - parseInt(a.votes, 10));
        const ranks = new Map();
        ranked.forEach((character, index) => {
            const votes = parseInt(character.votes, 10);
            if (!ranks.has(votes)) ranks.set(votes, index + 1);
        });

        const container = createBasicInfo('');
        characters.forEach((character, index) => {
            const comparison = comparisons[index];
            const rank = character.votes === '-' ? '-' : ranks.get(parseInt(character.votes, 10));
            container.append(createCard(character, comparison, {
                showDelete: characters.length > CONFIG.comparison.minAvgCharacters,
                rate: comparison.voteRate,
                rank
            }));
        });
        return container;
    }

    static generateOneToManyHTML(baseCharacter, compareCharacters, comparisons, totalVotes) {
        const classNames = compareCharacters.length === CONFIG.comparison.twoCharactersCount
            ? LAYOUT_CLASSES.twoChars
            : '';
        const container = createOneToManyLayout(classNames);
        const baseWrapper = container.querySelector(`.${LAYOUT_CLASSES.baseCharacter}`);
        const comparisonGrid = container.querySelector(`.${LAYOUT_CLASSES.charComparisonGrid}`);

        const baseRate = baseCharacter.votes === '-' || totalVotes === 0
            ? null
            : (parseInt(baseCharacter.votes, 10) / totalVotes * 100).toFixed(1);
        const baseCard = createCard(baseCharacter, null, {
            showDelete: true,
            rate: baseRate,
            rank: baseCharacter.rank
        });
        baseCard.classList.add(LAYOUT_CLASSES.main);
        baseWrapper.append(baseCard);

        compareCharacters.forEach((character, index) => {
            const comparison = comparisons[index];
            const rate = character.votes === '-' || totalVotes === 0
                ? null
                : (parseInt(character.votes, 10) / totalVotes * 100).toFixed(1);
            comparisonGrid.append(createCard(character, comparison, {
                showDelete: true,
                rate,
                rank: character.rank,
                rateDifference: comparison?.rateDiff,
                rankDifference: comparison?.rankDiff
            }));
        });

        return container;
    }

    static generateOneToOneHTML(characters, hasMultipleNormal) {
        const container = createBasicInfo(LAYOUT_CLASSES.twoChars);
        characters.forEach(character => {
            const comparison = hasMultipleNormal ? character : null;
            container.append(createCard(character, comparison, {
                showDelete: false,
                rate: character.voteRate,
                rank: character.rank,
                rateDifference: comparison?.rateDiff,
                rankDifference: comparison?.rankDiff
            }));
        });
        return container;
    }
}
