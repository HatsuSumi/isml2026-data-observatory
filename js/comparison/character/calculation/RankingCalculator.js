import { parseVotes } from './VoteCalculator.js';

export function createRankMap(characters) {
    const rankedCharacters = characters
        .map((character, index) => ({ character, index, votes: parseVotes(character.votes) }))
        .filter(entry => entry.votes !== null)
        .sort((a, b) => b.votes - a.votes || a.index - b.index);

    const rankMap = new Map();
    rankedCharacters.forEach((entry, index) => {
        if (!rankMap.has(entry.votes)) {
            rankMap.set(entry.votes, index + 1);
        }
    });

    return rankMap;
}

export function addRanks(characters, rankingCharacters = characters) {
    const rankMap = createRankMap(rankingCharacters);

    return characters.map(character => {
        const votes = parseVotes(character.votes);
        return {
            ...character,
            rank: votes === null ? '-' : rankMap.get(votes),
            rankDiff: null
        };
    });
}
