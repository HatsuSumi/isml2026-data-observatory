import { CONFIG } from '../../../common/config.js';
import { CharacterComparisonState } from '../state/CharacterComparisonState.js';
import { EventRepository } from '../../data/EventRepository.js';
import { CharacterRepository } from '../../data/CharacterRepository.js';
import { EventService } from '../../shared/EventService.js';
import { CharacterService } from './CharacterService.js';

function isHiddenRoundSixNecklaceMatch(match) {
    const name = String(match?.name || '');
    return name.includes('第一阶段第六轮') && (name.includes('项链赛') || name.includes('垂饰赛'));
}

export class CharacterManager {
    constructor({ eventService, eventRepository, characterRepository, characterService, state } = {}) {
        this.characters = [];
        this.events = null;
        this.state = state ?? new CharacterComparisonState();
        this.eventRepository = eventRepository ?? new EventRepository({ dataPath: CONFIG.events.dataPath });
        this.characterRepository = characterRepository ?? new CharacterRepository();
        this.eventService = eventService ?? new EventService(this.eventRepository);
        this.characterService = characterService ?? new CharacterService();
    }

    async loadEvents() {
        try {
            this.events = await this.eventService.loadEvents();
            return this.events;
        } catch (error) {
            console.error('[角色对比] loadEvents 失败:', error);
            throw error;
        }
    }

    getSelectableMatches() {
        return this.eventService.getSelectableMatches(this.events)
            .filter(match => !isHiddenRoundSixNecklaceMatch(match));
    }

    async loadCharacters(eventId) {
        const event = this.findEventById(eventId);
        if (!event?.links?.data) {
            throw new Error('找不到赛事数据路径');
        }

        try {
            this.characters = await this.characterRepository.findByEvent(event);
            this.state.setCharacters(this.characters);
        } catch (error) {
            console.error('加载角色数据失败:', error);
        }
    }

    findEventById(eventId) {
        return this.eventService.findMatch(this.events, eventId);
    }

    getTotalVotes(eventId) {
        const event = this.eventService.findStats(this.events, eventId);
        return event?.stats?.votes?.total ?? 0;
    }

    searchCharacters(keyword) {
        return this.characterService.search(this.characters, keyword);
    }

    get selectedCharacters() {
        return this.state.selectedCharacters;
    }

    set selectedCharacters(value) {
        this.state.selectedCharacters = value;
    }

    selectCharacter(cardId, character) {
        this.state.setSelectedCharacter(cardId, character);
    }

    unselectCharacter(cardId) {
        this.state.removeSelectedCharacter(cardId);
    }

    getSelectedCharacters() {
        return this.state.getSelectedCharacters();
    }

    reset() {
        this.state.clear();
    }

    getEventStats(eventId) {
        for (const monthKey in this.events.months) {
            const monthData = this.events.months[monthKey];
            const event = monthData.events.find(e =>
                e.matches?.some(m => m.id === eventId)
            );

            if (event) {
                return event;
            }
        }

        return null;
    }
}
