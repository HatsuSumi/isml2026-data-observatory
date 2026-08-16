import { calculateGroupBaseTotal } from '../calculation/GroupComparisonCalculator.js';

export const groupBaseTotalStrategy = ({ groups, totalVotes }) =>
    calculateGroupBaseTotal(groups, totalVotes);
