import { CONFIG } from '../common/config.js';
import { SERIES_ALIASES } from '../aliases/aliases.js';

export { CONFIG, SERIES_ALIASES };

export function collectCharacterTemplates() {
    return {
        characterCard: document.getElementById('character-card-template'),
        rankGroup: document.getElementById('rank-group-template'),
        rankRound: document.getElementById('rank-round-template'),
        characterCards: document.getElementById('character-cards-template'),
        ipText: document.getElementById('ip-text-template'),
        customTooltip: document.getElementById('custom-tooltip-template'),
        novaGroup: document.getElementById('nova-group-template'),
        seasonGroup: document.getElementById('season-group-template'),
        regexErrorTooltip: document.getElementById('regex-error-tooltip-template')
    };
}

export function normalizeSeriesName(name) {
    for (const [originalName, aliases] of Object.entries(SERIES_ALIASES)) {
        if (aliases.includes(name)) return originalName;
    }
    return name;
}
