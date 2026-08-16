import { addRanks } from '../calculation/RankingCalculator.js';

export class ComparisonActionsController {
    constructor({
        characterManager,
        comparisonInputCollector,
        comparisonController,
        selectors,
        layoutClasses,
        animationClasses,
        comparisonTypes,
        config,
        groupCompareTypes,
        messages,
        alertBox
    }) {
        this.characterManager = characterManager;
        this.comparisonInputCollector = comparisonInputCollector;
        this.comparisonController = comparisonController;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.comparisonTypes = comparisonTypes;
        this.config = config;
        this.groupCompareTypes = groupCompareTypes;
        this.messages = messages;
        this.alertBox = alertBox;
    }

    compare() {
        const selectedOption = document.querySelector(
            `${this.selectors.selectOption}.${this.animationClasses.selected}`
        );
        if (!selectedOption) {
            this.showMessage(this.messages.selectEvent);
            return;
        }

        const comparison = document.querySelector(this.selectors.characterComparison);
        const compareType = document.getElementById(this.layoutClasses.compareType).value;
        const input = this.comparisonInputCollector.collect({
            comparison,
            characters: this.characterManager,
            selectedOption,
            compareType
        });
        const groups = Array.from(comparison.querySelectorAll(this.selectors.characterGroup));

        if (groups.some(group =>
            group.querySelectorAll(this.selectors.groupMember).length < this.config.comparison.groupMinCharacters
        )) {
            this.showMessage(this.messages.emptyGroup);
            return;
        }

        const characters = input.characters;
        const isGroupComparison = this.groupCompareTypes.has(compareType);
        if (!this.validateGroups(input, groups, characters, isGroupComparison)) {
            return;
        }

        if (characters.length < this.config.comparison.minCharacters) {
            this.showMessage(this.messages.minCharacters);
            return;
        }
        if (compareType === this.comparisonTypes.oneToOne &&
            characters.length !== this.config.comparison.initialCards) {
            this.showMessage(this.messages.minOneToOneCharacters);
            return;
        }
        if (compareType !== this.comparisonTypes.oneToOne &&
            characters.length < this.config.comparison.minAvgCharacters) {
            this.showMessage(this.messages.minAvgCharacters);
            return;
        }
        if (new Set(characters.map(character => character.name)).size !== characters.length) {
            this.showMessage(this.messages.duplicateCharacter);
            return;
        }

        const eventId = selectedOption.dataset.value;
        const totalVotes = this.characterManager.getTotalVotes(eventId);
        this.renderTotalVotes(eventId);

        const charactersWithRank = addRanks(characters, this.characterManager.characters);
        const renderedResult = this.comparisonController.compare({
            characters: charactersWithRank,
            groups: isGroupComparison ? this.characterManager.state.groups : [],
            eventId,
            mode: compareType,
            totalVotes,
            allCharacters: this.characterManager.characters
        });

        this.renderResult(renderedResult);
    }

    validateGroups(input, groups, characters, isGroupComparison) {
        if (!isGroupComparison) {
            return true;
        }

        const groupCharacters = input.groups;
        groups.forEach(group => group.classList.remove(this.animationClasses.error));

        const autoGroupNames = [];
        groupCharacters.forEach((group, index) => {
            if (group.length > 0 && group.every(character => character.votes === '-')) {
                const groupNameInput = groups[index].querySelector(this.selectors.groupName);
                autoGroupNames.push(groupNameInput.value.trim() || `组名${index + 1}`);
                groups[index].classList.add(this.animationClasses.error);
            }
        });

        const allAreAuto = characters.length > 0 && characters.every(character => character.votes === '-');
        if (autoGroupNames.length > 0 || allAreAuto) {
            this.alertBox.show(
                allAreAuto
                    ? this.messages.allAutoCharacters.text
                    : this.messages.autoGroupExists.getText(autoGroupNames),
                allAreAuto
                    ? this.messages.allAutoCharacters.duration
                    : this.messages.autoGroupExists.duration,
                allAreAuto
                    ? this.messages.allAutoCharacters.type
                    : this.messages.autoGroupExists.type
            );
            return false;
        }

        this.characterManager.state.setGroups(groupCharacters);
        return true;
    }

    renderTotalVotes(eventId) {
        const event = this.characterManager.getEventStats(eventId);
        const totalVotes = document.querySelector(this.selectors.totalVotes);
        totalVotes.classList.remove(this.animationClasses.hidden);
        if (!event?.stats?.votes) {
            return;
        }

        document.querySelector(this.selectors.totalVotesValue).textContent = event.stats.votes.total;
        document.querySelector(this.selectors.totalVotesValid).textContent = `（有效：${event.stats.votes.valid}）`;
    }

    renderResult(renderedResult) {
        const resultContainer = document.getElementById(this.layoutClasses.comparisonResult);
        resultContainer.replaceChildren(renderedResult);

        resultContainer.querySelectorAll(this.selectors.charInfoCard).forEach(card => {
            card.classList.add(this.animationClasses.init);
        });

        requestAnimationFrame(() => {
            resultContainer.classList.add(this.animationClasses.show);
            resultContainer.querySelectorAll(this.selectors.charInfoCard).forEach(card => {
                card.classList.remove(this.animationClasses.init);
            });
        });

        resultContainer.scrollIntoView({ behavior: this.config.comparison.scroll.behavior });
    }

    showMessage(message) {
        this.alertBox.show(message.text, message.duration, message.type);
    }
}
