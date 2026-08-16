export class CharacterCardController {
    constructor({
        characterManager,
        selectors,
        layoutClasses,
        animationClasses,
        config,
        comparisonTypes,
        messages,
        alertBox,
        debounce,
        searchItemTemplate,
        getCompareType,
        calculateZIndex,
        updateDeleteButtons,
        compareCharacters,
        syncLayout,
    }) {
        this.characterManager = characterManager;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.config = config;
        this.comparisonTypes = comparisonTypes;
        this.messages = messages;
        this.alertBox = alertBox;
        this.debounce = debounce;
        this.searchItemTemplate = searchItemTemplate;
        this.getCompareType = getCompareType;
        this.calculateZIndex = calculateZIndex;
        this.updateDeleteButtons = updateDeleteButtons;
        this.compareCharacters = compareCharacters;
        this.syncLayout = syncLayout;
    }

    cloneTemplate(templateId) {
        const template = document.getElementById(templateId);

        if (!template) {
            throw new Error(`找不到角色模板: ${templateId}`);
        }

        return template.content.cloneNode(true).firstElementChild;
    }

    createCharacterCard(index, compareType) {
        const card = this.cloneTemplate(this.layoutClasses.characterCardTemplate);

        card.id = `character${index + 1}`;
        card.classList.add(this.animationClasses.init);
        card.draggable = true;
        card.style.zIndex = String(this.calculateZIndex(index, compareType));

        const input = card.querySelector(this.selectors.searchInput);
        input.placeholder = `选择角色${index + 1}...`;

        return card;
    }

    createSearchItem(character, onSelect) {
        const item = this.cloneTemplate(this.layoutClasses.searchItemTemplate);
        const avatar = item.querySelector('.search-avatar');
        const name = item.querySelector('.name');
        const ip = item.querySelector('.ip');
        const cv = item.querySelector('.cv');

        avatar.hidden = !character.avatar;

        if (character.avatar) {
            avatar.src = character.avatar;
            avatar.alt = character.name;
        }

        name.textContent = character.name;
        ip.textContent = `IP：${character.ip}`;

        cv.hidden = !character.cv;

        if (character.cv) {
            cv.textContent = `CV：${character.cv}`;
        }

        item.__character = character;
        item.addEventListener('click', () => onSelect(character));

        return item;
    }

    createEmptySearchItem(message) {
        const item = this.cloneTemplate(this.layoutClasses.emptySearchTemplate);
        const messageElement = item.querySelector('.empty-search-message');

        messageElement.textContent = message;

        return item;
    }

    renderSearchResults(container, characters, emptyMessage, onSelect) {
        container.replaceChildren();

        if (!characters.length) {
            container.appendChild(this.createEmptySearchItem(emptyMessage));
            return;
        }

        characters.forEach((character, index) => {
            const item = this.createSearchItem(character, onSelect);

            if (index === 0) {
                item.classList.add(this.animationClasses.active);
            }

            container.appendChild(item);
        });
    }

    getSearchItems(container) {
        return Array.from(
            container.querySelectorAll(this.selectors.searchItem)
        ).filter(item => item.__character);
    }

    addCharacter(existingCardCount = null) {
        const comparison = document.querySelector(this.selectors.characterComparison);

        if (!this.characterManager.characters.length) {
            this.alertBox.show(
                this.messages.selectEvent.text,
                this.messages.selectEvent.duration,
                this.messages.selectEvent.type
            );
            return;
        }

        const compareType = this.getCompareType();
        const cardCount = existingCardCount ??
            comparison.querySelectorAll(this.selectors.characterCard).length;

        if (
            compareType === this.comparisonTypes.oneToOne &&
            cardCount >= this.config.comparison.initialCards
        ) {
            this.alertBox.show(
                this.messages.minOneToOneCharacters.text,
                this.messages.minOneToOneCharacters.duration,
                this.messages.minOneToOneCharacters.type
            );
            return;
        }

        if (
            compareType === this.comparisonTypes.baseCompare &&
            cardCount === this.config.comparison.baseCompareMinCards
        ) {
            comparison.classList.remove(this.layoutClasses.twoChars);
        }

        const card = this.createCharacterCard(cardCount, compareType);

        comparison.appendChild(card);
        this.bindCardEvents(card);

        requestAnimationFrame(() => {
            card.classList.remove(this.animationClasses.init);
        });

        this.setupDragAndDrop();
        this.updateDeleteButtons();
    }

    bindCardEvents(card) {
        const input = card.querySelector(this.selectors.searchInput);

        input.addEventListener(
            'input',
            this.debounce(
                event => this.handleSearch(event.target),
                this.config.comparison.debounce.delay
            )
        );

        input.addEventListener('focus', event => {
            this.handleFocus(event.target);
        });

        input.addEventListener('keydown', event => {
            this.handleKeydown(event);
        });

        card.querySelector(this.selectors.deleteBtn).addEventListener(
            'click',
            () => this.deleteCharacter(card)
        );
    }

    async handleSearch(input) {
        const card = input.closest(this.selectors.characterCard);
        const resultsContainer = card.querySelector(this.selectors.searchResults);

        if (!input.value.trim()) {
            resultsContainer.classList.add(this.animationClasses.hidden);
            resultsContainer.replaceChildren();
            return;
        }

        const results = this.characterManager.searchCharacters(input.value);

        this.renderSearchResults(
            resultsContainer,
            results,
            this.messages.noCharacterFound.text,
            character => this.selectCharacter(card.id, character)
        );

        resultsContainer.classList.remove(this.animationClasses.hidden);
    }

    handleFocus(input) {
        const card = input.closest(this.selectors.characterCard);
        const resultsContainer = card.querySelector(this.selectors.searchResults);

        if (!this.characterManager.characters.length) {
            this.alertBox.show(
                this.messages.selectEvent.text,
                this.messages.selectEvent.duration,
                this.messages.selectEvent.type
            );

            input.blur();
            return;
        }

        const selectedKeys = new Set(
            this.characterManager
                .getSelectedCharacters()
                .map(character => `${character.name}@${character.ip}`)
        );

        const availableCharacters = this.characterManager.characters.filter(
            character => !selectedKeys.has(`${character.name}@${character.ip}`)
        );

        this.renderSearchResults(
            resultsContainer,
            availableCharacters,
            this.messages.noMoreCharacters.text,
            character => this.selectCharacter(card.id, character)
        );

        resultsContainer.classList.remove(this.animationClasses.hidden);
    }

    selectCharacter(cardId, character) {
        const card = document.getElementById(cardId);
        const input = card.querySelector(this.selectors.searchInput);
        const results = card.querySelector(this.selectors.searchResults);

        const duplicate = this.characterManager
            .getSelectedCharacters()
            .some(
                selectedCharacter =>
                    selectedCharacter.name === character.name &&
                    selectedCharacter.ip === character.ip
            );

        if (duplicate) {
            this.alertBox.show(
                this.messages.duplicateCharacter.text,
                this.messages.duplicateCharacter.duration,
                this.messages.duplicateCharacter.type
            );

            input.value = '';
            results.classList.add(this.animationClasses.hidden);
            return;
        }

        input.value = `${character.name}@${character.ip}`;
        results.classList.add(this.animationClasses.hidden);
        input.blur();

        this.characterManager.selectCharacter(cardId, character);
        this.updateDeleteButtons();
    }

    handleKeydown(event) {
        const input = event.target;
        const card = input.closest(this.selectors.characterCard);
        const results = card.querySelector(this.selectors.searchResults);
        const items = this.getSearchItems(results);

        if (!items.length) {
            return;
        }

        let index = items.findIndex(item =>
            item.classList.contains(this.animationClasses.active)
        );

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (index >= 0) {
                items[index].classList.remove(this.animationClasses.active);
            }

            if (index < 0) {
                index = event.key === 'ArrowUp' ? items.length - 1 : 0;
            } else {
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                index = (index + direction + items.length) % items.length;
            }

            items[index].classList.add(this.animationClasses.active);
            items[index].scrollIntoView({
                block: this.config.comparison.scroll.block,
                behavior: this.config.comparison.scroll.behavior
            });
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            const selectedItem = items[index >= 0 ? index : 0];
            this.selectCharacter(card.id, selectedItem.__character);
        }
    }

    setupDragAndDrop() {
        document.querySelectorAll(this.selectors.characterCard).forEach(card => {
            if (card.dataset.dragBound === 'true') {
                return;
            }

            card.dataset.dragBound = 'true';

            card.addEventListener('dragstart', event => {
                const results = card.querySelector(this.selectors.searchResults);
                const resultsVisible = !results.classList.contains(
                    this.animationClasses.hidden
                );

                if (!card.draggable || resultsVisible) {
                    event.preventDefault();
                    return;
                }

                card.classList.add(this.animationClasses.dragging);
                event.dataTransfer.setData('text/plain', card.id);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove(this.animationClasses.dragging);
            });

            card.addEventListener('dragover', event => {
                event.preventDefault();
                card.classList.add(this.animationClasses.dragOver);
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove(this.animationClasses.dragOver);
            });

            card.addEventListener('drop', event => {
                event.preventDefault();
                card.classList.remove(this.animationClasses.dragOver);

                const draggedCard = document.getElementById(
                    event.dataTransfer.getData('text/plain')
                );

                if (draggedCard) {
                    this.swapCards(draggedCard, card);
                }
            });
        });
    }

    swapCards(card1, card2) {
        if (card1.id === card2.id) {
            return;
        }

        const input1 = card1.querySelector(this.selectors.searchInput);
        const input2 = card2.querySelector(this.selectors.searchInput);
        const originalId = card1.id;

        card1.id = card2.id;
        card2.id = originalId;

        [input1.value, input2.value] = [input2.value, input1.value];

        const selected = new Map();

        document.querySelectorAll(this.selectors.characterCard).forEach(card => {
            const character = this.characterManager.selectedCharacters.get(card.id);

            if (character) {
                selected.set(card.id, character);
            }
        });

        this.characterManager.selectedCharacters = selected;

        const comparisonResult = document.getElementById(
            this.layoutClasses.comparisonResult
        );

        if (comparisonResult?.childElementCount) {
            this.compareCharacters();
        }
    }

    deleteCharacter(cardElement, isComparisonResult = false) {
        const resultContainer = document.getElementById(
            this.layoutClasses.comparisonResult
        );

        const hasComparisonResult = Boolean(resultContainer?.childElementCount);
        const compareType = this.getCompareType();
        const cards = document.querySelectorAll(this.selectors.characterCard);

        const minRequired =
            compareType === this.comparisonTypes.avgCompare
                ? this.config.comparison.minAvgCharacters
                : compareType === this.comparisonTypes.baseCompare
                    ? this.config.comparison.minBaseCharacters
                    : this.config.comparison.initialCards;

        if (cards.length <= minRequired) {
            const message =
                compareType === this.comparisonTypes.avgCompare
                    ? this.messages.minAvgCharacters
                    : compareType === this.comparisonTypes.baseCompare
                        ? this.messages.minCharacters
                        : this.messages.minOneToOneCharacters;

            this.alertBox.show(
                message.text,
                message.duration,
                message.type
            );
            return;
        }

        const markResultRelatedCards = (name, ip) => {
            document.querySelectorAll(this.selectors.characterCard).forEach(
                selectCard => {
                    const input = selectCard.querySelector(
                        this.selectors.searchInput
                    );

                    if (input.value === `${name}@${ip}`) {
                        selectCard.classList.add(
                            this.animationClasses.deleting
                        );
                    }
                }
            );
        };

        if (isComparisonResult) {
            const name = cardElement.querySelector('h3').textContent;
            const ip = cardElement
                .querySelector('p')
                .textContent
                .replace('IP：', '');

            cardElement.classList.add(this.animationClasses.deleting);
            markResultRelatedCards(name, ip);
        } else {
            cardElement.classList.add(this.animationClasses.deleting);

            if (hasComparisonResult) {
                const name = cardElement
                    .querySelector(this.selectors.searchInput)
                    .value
                    .split('@')[0];

                const resultCard = Array.from(
                    resultContainer.querySelectorAll(
                        this.selectors.charInfoCard
                    )
                ).find(
                    result =>
                        result.querySelector('h3').textContent === name
                );

                resultCard?.classList.add(this.animationClasses.deleting);
            }
        }

        setTimeout(() => {
            if (isComparisonResult) {
                const name = cardElement.querySelector('h3').textContent;
                const ip = cardElement
                    .querySelector('p')
                    .textContent
                    .replace('IP：', '');

                document.querySelectorAll(this.selectors.characterCard).forEach(
                    selectCard => {
                        const input = selectCard.querySelector(
                            this.selectors.searchInput
                        );

                        if (input.value === `${name}@${ip}`) {
                            this.characterManager.selectedCharacters.delete(
                                selectCard.id
                            );
                            selectCard.remove();
                        }
                    }
                );

                cardElement.remove();
            } else {
                const name = cardElement
                    .querySelector(this.selectors.searchInput)
                    .value
                    .split('@')[0];

                const cardId = cardElement.id;
                cardElement.remove();
                this.characterManager.selectedCharacters.delete(cardId);

                if (hasComparisonResult) {
                    const resultCard = Array.from(
                        resultContainer.querySelectorAll(
                            this.selectors.charInfoCard
                        )
                    ).find(
                        result =>
                            result.querySelector('h3').textContent === name
                    );

                    resultCard?.remove();
                }
            }

            document.querySelectorAll(this.selectors.characterCard).forEach(
                (card, index) => {
                    card.id = `character${index + 1}`;

                    card.querySelector(
                        this.selectors.searchInput
                    ).placeholder = `选择角色${index + 1}...`;

                    card.style.zIndex = String(
                        this.calculateZIndex(index, compareType)
                    );
                }
            );

            this.characterManager.selectedCharacters.clear();

            document.querySelectorAll(this.selectors.characterCard).forEach(
                card => {
                    const input = card.querySelector(
                        this.selectors.searchInput
                    );

                    if (!input.value) {
                        return;
                    }

                    const [name, ip] = input.value.split('@');
                    const character = this.characterManager.characters.find(
                        candidate =>
                            candidate.name === name && candidate.ip === ip
                    );

                    if (character) {
                        this.characterManager.selectedCharacters.set(
                            card.id,
                            character
                        );
                    }
                }
            );

            if (hasComparisonResult) {
                this.compareCharacters();
            }

            this.updateDeleteButtons();
            this.syncLayout(
                document.querySelector(this.selectors.characterComparison),
                compareType
            );
        }, this.config.comparison.animation.duration);
    }

    getCompareType() {
        return document.getElementById(
            this.layoutClasses.compareType
        ).value;
    }
}