import { calculateGroupAverage } from '../calculation/GroupComparisonCalculator.js';

export const groupAvgStrategy = ({ groups, totalVotes }) =>
    calculateGroupAverage(groups, totalVotes);
