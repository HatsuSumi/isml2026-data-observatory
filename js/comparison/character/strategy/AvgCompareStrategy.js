import { calculateAverage } from '../calculation/CharacterComparisonCalculator.js';

export const avgCompareStrategy = ({ characters, totalVotes }) =>
    calculateAverage(characters, totalVotes);
