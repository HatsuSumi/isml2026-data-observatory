import { calculateGroupBaseAverage } from '../calculation/GroupComparisonCalculator.js';

export const groupBaseAvgStrategy = ({ groups, totalVotes }) =>
    calculateGroupBaseAverage(groups, totalVotes);
