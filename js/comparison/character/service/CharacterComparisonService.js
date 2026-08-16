import { oneToOneStrategy } from '../strategy/OneToOneStrategy.js';
import { baseCompareStrategy } from '../strategy/BaseCompareStrategy.js';
import { avgCompareStrategy } from '../strategy/AvgCompareStrategy.js';
import { groupTotalStrategy } from '../strategy/GroupTotalStrategy.js';
import { groupAvgStrategy } from '../strategy/GroupAvgStrategy.js';
import { groupBaseTotalStrategy } from '../strategy/GroupBaseTotalStrategy.js';
import { groupBaseAvgStrategy } from '../strategy/GroupBaseAvgStrategy.js';

export class CharacterComparisonService {
    constructor({ strategies = createCharacterComparisonStrategies() } = {}) {
        this.strategies = strategies;
    }

    compare({ characters, groups = [], mode, totalVotes }) {
        const strategy = this.strategies[mode];
        if (!strategy) {
            throw new Error(`未知对比模式: ${mode}`);
        }

        return strategy({ characters, groups, totalVotes });
    }
}

export function createCharacterComparisonStrategies() {
    return {
        oneToOne: oneToOneStrategy,
        baseCompare: baseCompareStrategy,
        avgCompare: avgCompareStrategy,
        groupTotalCompare: groupTotalStrategy,
        groupAvgCompare: groupAvgStrategy,
        groupBaseTotalCompare: groupBaseTotalStrategy,
        groupBaseAvgCompare: groupBaseAvgStrategy
    };
}
