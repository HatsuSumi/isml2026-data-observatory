import { CONFIG, COMPARISON_TYPES, LAYOUT_CLASSES, SELECTORS } from '../../../common/config.js';
import { CharacterResultRenderer } from './CharacterResultRenderer.js';
import { GroupResultRenderer } from './GroupResultRenderer.js';

export class ComparisonResultGenerator {

    static setGroupLayout(container, groups) {
        return GroupResultRenderer.setGroupLayout(container, groups);
    }

    static generateBasicInfo(characters, groups, result, totalVotes, eventId, compareType, allCharacters) {
        const stage = eventId.split('/')[0];

        if (stage !== CONFIG.stages.nomination) {
            return this.generateStageInfo(characters, totalVotes, compareType, result);
        }

        if (compareType === COMPARISON_TYPES.baseCompare) {
            return this.generateOneToManyHTML(
                result.baseCharacter,
                result.compareCharacters,
                result.comparisons,
                totalVotes
            );
        }
        if (compareType === COMPARISON_TYPES.avgCompare) {
            return this.generateAvgCompareHTML(
                characters,
                result.average,
                result.comparisons,
                totalVotes,
                allCharacters
            );
        }
        if (compareType === COMPARISON_TYPES.oneToOne) {
            return this.generateOneToOneHTML(
                result.characters,
                result.hasMultipleNormal
            );
        }
        if (compareType === COMPARISON_TYPES.groupBaseTotalCompare) {
            return this.generateGroupBaseTotalHTML(result.groups, result.comparisons, totalVotes);
        }
        if (compareType === COMPARISON_TYPES.groupBaseAvgCompare) {
            return this.generateGroupBaseAvgHTML(result.groups, result.comparisons, totalVotes);
        }
        if (compareType === COMPARISON_TYPES.groupAvgCompare) {
            return this.generateGroupAvgHTML(result.groups, result.comparisons, totalVotes, result.allGroupsAverage);
        }
        if (compareType === COMPARISON_TYPES.groupTotalCompare) {
            return this.generateGroupTotalHTML(result.groups, result.comparisons, totalVotes, result.allGroupsTotal);
        }

        console.error(`未知的比较模式: ${compareType}`);
        return '';
    }





    static generateAvgCompareHTML(...args) {
        return CharacterResultRenderer.generateAvgCompareHTML(...args);
    }

    static generateOneToManyHTML(...args) {
        return CharacterResultRenderer.generateOneToManyHTML(...args);
    }

    static generateOneToOneHTML(...args) {
        return CharacterResultRenderer.generateOneToOneHTML(...args);
    }

    static generateGroupTotalHTML(...args) {
        return GroupResultRenderer.generateGroupTotalHTML(...args);
    }

    static generateGroupBaseTotalHTML(...args) {
        return GroupResultRenderer.generateGroupBaseTotalHTML(...args);
    }

    static generateGroupBaseAvgHTML(...args) {
        return GroupResultRenderer.generateGroupBaseAvgHTML(...args);
    }

    static generateGroupAvgHTML(...args) {
        return GroupResultRenderer.generateGroupAvgHTML(...args);
    }

    static generateStageInfo(characters, totalVotes, compareType, result) {
        if (compareType !== COMPARISON_TYPES.oneToOne) {
            console.error(`阶段赛事不支持比较模式: ${compareType}`);
            return '';
        }

        return this.generateOneToOneHTML(
            result.characters ?? characters,
            result.hasMultipleNormal ?? false
        );
    }





}

