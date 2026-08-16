import { calculateBase } from '../calculation/CharacterComparisonCalculator.js';

export const baseCompareStrategy = ({ characters, totalVotes }) =>
    calculateBase(characters, totalVotes);
