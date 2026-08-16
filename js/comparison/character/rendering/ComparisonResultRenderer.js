export class ComparisonResultRenderer {
    constructor({ generator }) {
        this.generator = generator;
    }

    render({ characters, groups = [], result = {}, totalVotes, eventId, mode, allCharacters }) {
        return this.generator.generateBasicInfo(
            characters,
            groups,
            result,
            totalVotes,
            eventId,
            mode,
            allCharacters
        );
    }
}
