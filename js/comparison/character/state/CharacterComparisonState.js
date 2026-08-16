export class CharacterComparisonState {
    constructor() {
        this.eventId = null;
        this.mode = null;
        this.characters = [];
        this.groups = [];
        this.selectedCharacters = new Map();
        this.result = null;
    }

    setEvent(eventId) {
        this.eventId = eventId;
        this.characters = [];
        this.groups = [];
        this.result = null;
    }

    setMode(mode) {
        this.mode = mode;
        this.result = null;
    }

    setCharacters(characters) {
        this.characters = [...characters];
    }

    setGroups(groups) {
        this.groups = groups.map(group => [...group]);
    }

    setSelectedCharacter(cardId, character) {
        this.selectedCharacters.set(cardId, character);
    }

    removeSelectedCharacter(cardId) {
        this.selectedCharacters.delete(cardId);
    }

    getSelectedCharacters() {
        return Array.from(this.selectedCharacters.values());
    }

    setResult(result) {
        this.result = result;
    }

    clear() {
        this.eventId = null;
        this.mode = null;
        this.characters = [];
        this.groups = [];
        this.selectedCharacters.clear();
        this.result = null;
    }
}
