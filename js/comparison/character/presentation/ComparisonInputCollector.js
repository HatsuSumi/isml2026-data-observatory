export class ComparisonInputCollector {
    constructor({ selectors, groupCompareTypes }) {
        this.selectors = selectors;
        this.groupCompareTypes = groupCompareTypes;
    }

    collect({ comparison, characters, selectedOption, compareType }) {
        const groups = Array.from(comparison.querySelectorAll(this.selectors.characterGroup));
        const selectedCharacters = characters.getSelectedCharacters();
        const result = {
            eventId: selectedOption?.dataset.value ?? null,
            mode: compareType,
            characters: selectedCharacters,
            groups: []
        };

        if (!this.groupCompareTypes.has(compareType)) {
            return result;
        }

        result.groups = groups.map(group => Array.from(
            group.querySelectorAll(this.selectors.groupMember)
        ).map(member => {
            const avatar = member.querySelector(this.selectors.characterAvatar);
            if (!avatar) return null;
            const [name, ip] = avatar.title.split('@');
            return selectedCharacters.find(character => character.name === avatar.alt && character.ip === ip)
                ?? selectedCharacters.find(character => character.name === name && character.ip === ip)
                ?? null;
        }).filter(Boolean));

        return result;
    }
}
