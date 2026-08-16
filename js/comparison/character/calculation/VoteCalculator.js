export function parseVotes(votes) {
    if (votes === '-' || votes === null || votes === undefined) {
        return null;
    }

    const value = Number.parseInt(votes, 10);
    return Number.isNaN(value) ? null : value;
}

export function percentage(votes, total) {
    if (votes === null || total === 0) {
        return null;
    }

    return (votes / total) * 100;
}

export function sumVotes(characters) {
    return characters.reduce((total, character) => {
        return total + (parseVotes(character.votes) ?? 0);
    }, 0);
}

export function averageVotes(characters) {
    const validVotes = characters
        .map(character => parseVotes(character.votes))
        .filter(votes => votes !== null);

    return validVotes.length === 0
        ? 0
        : validVotes.reduce((total, votes) => total + votes, 0) / validVotes.length;
}

export function formatPercentage(value) {
    return value === null ? null : value.toFixed(1);
}
