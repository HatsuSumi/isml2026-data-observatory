import { CONFIG, COMPARISON_TYPES } from '../../../common/config.js';
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

        const strategy = {
            [COMPARISON_TYPES.baseCompare]: () => this.generateOneToManyHTML(
                result.baseCharacter,
                result.compareCharacters,
                result.comparisons,
                totalVotes
            ),
            [COMPARISON_TYPES.avgCompare]: () => this.generateAvgCompareHTML(
                characters,
                result.average,
                result.comparisons,
                totalVotes,
                allCharacters
            ),
            [COMPARISON_TYPES.oneToOne]: () => this.generateOneToOneHTML(
                result.characters,
                result.hasMultipleNormal
            ),
            [COMPARISON_TYPES.groupBaseTotalCompare]: () => this.generateGroupBaseTotalHTML(
                result.groups,
                result.comparisons,
                totalVotes
            ),
            [COMPARISON_TYPES.groupBaseAvgCompare]: () => this.generateGroupBaseAvgHTML(
                result.groups,
                result.comparisons,
                totalVotes
            ),
            [COMPARISON_TYPES.groupAvgCompare]: () => this.generateGroupAvgHTML(
                result.groups,
                result.comparisons,
                totalVotes,
                result.allGroupsAverage
            ),
            [COMPARISON_TYPES.groupTotalCompare]: () => this.generateGroupTotalHTML(
                result.groups,
                result.comparisons,
                totalVotes,
                result.allGroupsTotal
            )
        }[compareType];

        if (strategy) {
            return strategy();
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

