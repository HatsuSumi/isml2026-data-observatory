import { calculateGroupTotal } from '../calculation/GroupComparisonCalculator.js';

export const groupTotalStrategy = ({ groups, totalVotes }) =>
    calculateGroupTotal(groups, totalVotes);
