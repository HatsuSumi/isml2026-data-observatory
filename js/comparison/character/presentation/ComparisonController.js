export class ComparisonController {
    constructor({ state, comparisonService, renderer }) {
        this.state = state;
        this.comparisonService = comparisonService;
        this.renderer = renderer;
    }

    compare({ characters, groups, eventId, mode, totalVotes, allCharacters }) {
        this.state.setEvent(eventId);
        this.state.setMode(mode);
        this.state.setCharacters(characters);
        this.state.setGroups(groups);

        const result = this.comparisonService.compare({
            characters,
            groups,
            mode,
            totalVotes
        });
        this.state.setResult(result);

        return this.renderer.render({
            characters: result.characters ?? characters,
            groups: result.groups ?? groups,
            result,
            totalVotes,
            eventId,
            mode,
            allCharacters
        });
    }
}
