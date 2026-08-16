export class ResetController {
    constructor({
        selectors,
        layoutClasses,
        animationClasses,
        comparisonTypes,
        config,
        groupCompareTypes,
        createGroup,
        addCharacter,
        unbindGroupEvents,
        resetCharacterManager,
        updateDeleteButtons,
        resetCardContent,
    }) {
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.comparisonTypes = comparisonTypes;
        this.config = config;
        this.groupCompareTypes = groupCompareTypes;
        this.createGroup = createGroup;
        this.addCharacter = addCharacter;
        this.unbindGroupEvents = unbindGroupEvents;
        this.resetCharacterManager = resetCharacterManager;
        this.updateDeleteButtons = updateDeleteButtons;
        this.resetCardContent = resetCardContent;
    }

    reset() {
        const currentType = document.getElementById(this.layoutClasses.compareType).value;
        const comparison = document.querySelector(this.selectors.characterComparison);

        comparison.classList.remove(this.layoutClasses.oneToManyLayout, this.layoutClasses.twoChars);

        if (this.groupCompareTypes.has(currentType)) {
            this.resetGroups(comparison);
        } else {
            this.resetCards(comparison, currentType);
        }

        this.clearResults();
        this.resetCharacterManager();
        this.updateDeleteButtons();
    }

    resetGroups(comparison) {
        comparison.querySelectorAll(`${this.selectors.characterCard}, ${this.selectors.divider}`).forEach(element => {
            element.remove();
        });

        comparison.querySelectorAll(this.selectors.characterGroup).forEach(group => {
            this.unbindGroupEvents(group);
            group.remove();
        });

        for (let i = 0; i < this.config.comparison.groupCompareMinGroups; i += 1) {
            const group = this.createGroup(i);
            if (group) {
                comparison.appendChild(group);
            }
        }
    }

    resetCards(comparison, currentType) {
        comparison.querySelectorAll(this.selectors.characterGroup).forEach(group => {
            this.unbindGroupEvents(group);
            group.remove();
        });

        comparison.querySelectorAll(this.selectors.characterCard).forEach(card => {
            card.remove();
        });

        const cardCount = currentType === this.comparisonTypes.avgCompare || currentType === this.comparisonTypes.baseCompare
            ? this.config.comparison.baseCompareMinCards
            : this.config.comparison.initialCards;

        for (let i = 0; i < cardCount; i += 1) {
            this.addCharacter(i);
        }
    }

    resetExceptEvent() {
        document.querySelectorAll(this.selectors.characterCard).forEach((card, index) => {
            this.resetCardContent(card, index);
        });

        this.clearResults();
        this.resetCharacterManager();
        this.updateDeleteButtons();
    }

    clearResults() {
        const resultContainer = document.getElementById(this.layoutClasses.comparisonResult);
        resultContainer.classList.remove(this.animationClasses.show);
        resultContainer.innerHTML = '';
        document.querySelector(this.selectors.totalVotes).classList.add(this.animationClasses.hidden);
    }
}
