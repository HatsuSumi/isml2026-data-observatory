import { formatPercentage, parseVotes, percentage } from './VoteCalculator.js';

export function calculateOneToOne(characters, totalVotes) {
    const validCharacters = characters
        .map(character => parseVotes(character.votes))
        .filter(votes => votes !== null);
    const hasMultipleNormal = validCharacters.length >= 2;

    return {
        hasMultipleNormal,
        characters: characters.map((character, index) => {
            const votes = parseVotes(character.votes);
            const other = characters
                .filter((_, otherIndex) => otherIndex !== index)
                .map(otherCharacter => ({
                    character: otherCharacter,
                    votes: parseVotes(otherCharacter.votes)
                }))
                .find(entry => entry.votes !== null);
            const voteDiff = votes === null || !other || !hasMultipleNormal
                ? null
                : votes - other.votes;
            const rankDiff = Number.isFinite(character.rank) && Number.isFinite(other?.character.rank)
                ? other.character.rank - character.rank
                : null;

            return {
                ...character,
                voteDiff,
                rateDiff: voteDiff === null
                    ? null
                    : formatPercentage(percentage(voteDiff, totalVotes)),
                rankDiff,
                voteRate: formatPercentage(percentage(votes, totalVotes))
            };
        })
    };
}

export function calculateBase(characters, totalVotes) {
    const [baseCharacter, ...compareCharacters] = characters;
    const baseVotes = parseVotes(baseCharacter?.votes);

    return {
        baseCharacter,
        compareCharacters,
        comparisons: compareCharacters.map(character => {
            const compareVotes = parseVotes(character.votes);
            if (baseVotes === null || compareVotes === null) {
                return {
                    voteDiff: 0,
                    voteRate: 0,
                    compareRate: 0,
                    rateDiff: 0,
                    isLeading: false
                };
            }

            return {
                voteDiff: baseVotes - compareVotes,
                voteRate: formatPercentage(percentage(baseVotes, totalVotes)),
                compareRate: formatPercentage(percentage(compareVotes, totalVotes)),
                rateDiff: formatPercentage(percentage(baseVotes - compareVotes, totalVotes)),
                isLeading: baseVotes > compareVotes
            };
        })
    };
}

export function calculateAverage(characters, totalVotes) {
    const normalCharacters = characters.filter(character => parseVotes(character.votes) !== null);
    const average = normalCharacters.length === 0
        ? 0
        : normalCharacters.reduce((total, character) => total + parseVotes(character.votes), 0) / normalCharacters.length;

    return {
        average,
        comparisons: characters.map(character => {
            const votes = parseVotes(character.votes);
            if (votes === null) {
                return { voteDiff: null, voteRate: null, rateDiff: null, isLeading: null, isAuto: true };
            }
            if (normalCharacters.length === 1) {
                return {
                    voteDiff: null,
                    voteRate: formatPercentage(percentage(votes, totalVotes)),
                    rateDiff: null,
                    isLeading: null,
                    isAuto: false
                };
            }
            return {
                voteDiff: Number((votes - average).toFixed(1)),
                voteRate: formatPercentage(percentage(votes, totalVotes)),
                rateDiff: formatPercentage(percentage(votes - average, totalVotes)),
                isLeading: votes > average,
                isAuto: false
            };
        })
    };
}
