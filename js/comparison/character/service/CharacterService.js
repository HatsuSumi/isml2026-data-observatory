import { getSeriesNames } from '../../../aliases/aliases.js';

export class CharacterService {
    search(characters, keyword) {
        const term = keyword.trim().toLowerCase();
        if (!term) return [];

        return characters.filter(character => [
            character.name,
            character.cv,
            ...getSeriesNames(character.ip)
        ].filter(Boolean).some(value => value.toLowerCase().includes(term)));
    }
}
