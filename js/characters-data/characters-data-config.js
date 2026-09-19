import { CONFIG } from '../common/config.js';
import { SERIES_ALIASES, canonicalSeriesName, getSeriesNames } from '../aliases/aliases.js';

export { CONFIG, SERIES_ALIASES, canonicalSeriesName, getSeriesNames };

export function collectCharacterTemplates() {
    return {
        characterCard: document.getElementById('character-card-template'),
        rankGroup: document.getElementById('rank-group-template'),
        rankRound: document.getElementById('rank-round-template'),
        characterCards: document.getElementById('character-cards-template'),
        emptyState: document.getElementById('character-data-empty-template'),
        ipText: document.getElementById('ip-text-template'),
        customTooltip: document.getElementById('custom-tooltip-template'),
        novaGroup: document.getElementById('nova-group-template'),
        seasonGroup: document.getElementById('season-group-template'),
        regexErrorTooltip: document.getElementById('regex-error-tooltip-template')
    };
}

export function normalizeSeriesName(name) {
    return canonicalSeriesName(name);
}
