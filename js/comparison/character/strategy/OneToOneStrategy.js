import { calculateOneToOne } from '../calculation/CharacterComparisonCalculator.js';

export const oneToOneStrategy = ({ characters, totalVotes }) =>
    calculateOneToOne(characters, totalVotes);
