export class GroupController {
    constructor({
        characterManager,
        clickHandlers,
        selectors,
        layoutClasses,
        animationClasses,
        comparisonTypes,
        config,
        showCharacterSelectModal,
        getCompareType,
        searchCharacters,
        alertBox,
        messages,
    }) {
        this.characterManager = characterManager;
        this.clickHandlers = clickHandlers;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.comparisonTypes = comparisonTypes;
        this.config = config;
        this.showCharacterSelectModal = showCharacterSelectModal;

        this.getCompareType = getCompareType;
        this.searchCharacters = searchCharacters;
        this.alertBox = alertBox;
        this.messages = messages;
        this.cardCounter = 0;
    }

    createGroup(index) {
        const template = document.getElementById(this.layoutClasses.groupTemplate);
        if (!template) {
            console.error('获取组模板失败');
            return null;
        }

        const group = template.content.cloneNode(true).firstElementChild;
        group.classList.add(this.animationClasses.init);

        const nameInput = group.querySelector(this.selectors.groupName);
        const baseGroupTag = group.querySelector('.base-group-tag');
        const compareType = this.getCompareType();
        const isBaseCompareType = compareType === this.comparisonTypes.groupBaseTotalCompare ||
            compareType === this.comparisonTypes.groupBaseAvgCompare;

        nameInput.placeholder = `组名${index + 1}`;
        if (isBaseCompareType && index === 0) {
            baseGroupTag.textContent = '（基准组）';
        }

        nameInput.addEventListener('input', () => {
            const value = nameInput.value.trim();
            nameInput.classList.toggle(this.animationClasses.invalid, !value);
        });

        nameInput.addEventListener('blur', () => {
            if (!nameInput.value.trim()) {
                nameInput.value = nameInput.placeholder;
            }
        });

        nameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameInput.blur();
            }
        });

        requestAnimationFrame(() => {
            group.classList.remove(this.animationClasses.init);
        });

        const deleteBtn = group.querySelector(this.selectors.deleteGroupBtn);
        deleteBtn.addEventListener('click', e => {
            e.stopPropagation();
            this.deleteGroup(group);
        });

        const groupCharacters = group.querySelector(this.selectors.groupCharacters);
        const clickHandler = () => {
            if (!groupCharacters.querySelector(this.selectors.groupMember)) {
                this.showCharacterSelectModal(group);
            }
        };
        groupCharacters.addEventListener('click', clickHandler);
        this.clickHandlers.set(groupCharacters, clickHandler);

        return group;
    }

    handleGroupSearch(input, group) {
        const results = this.searchCharacters(input.value);
        const resultsContainer = input.nextElementSibling;

        if (results.length > 0) {
            resultsContainer.innerHTML = results
                .map(char => this.searchItemTemplate(char))
                .join('');

            resultsContainer.querySelectorAll(this.selectors.searchItem).forEach(item => {
                item.addEventListener('click', () => {
                    const character = JSON.parse(item.dataset.character);
                    this.addCharacterToGroup(character, group);
                    group.querySelector(this.selectors.groupSearch).classList.remove(this.animationClasses.show);
                    group.querySelector(this.selectors.groupCharacters).classList.remove(this.animationClasses.searching);
                });
            });

            resultsContainer.classList.remove(this.animationClasses.hidden);
        }
    }

    deleteGroup(group) {
        const comparison = document.querySelector(this.selectors.characterComparison);
        const groupCount = comparison.querySelectorAll(this.selectors.characterGroup).length;

        if (groupCount <= this.config.comparison.groupCompareMinGroups) {
            this.alertBox.show(this.messages.minGroups.text, this.messages.minGroups.duration, this.messages.minGroups.type);
            return;
        }

        group.classList.add(this.animationClasses.deleting);
        setTimeout(() => {
            group.remove();
            comparison.querySelectorAll(this.selectors.characterGroup).forEach((currentGroup, index) => {
                currentGroup.querySelector(this.selectors.groupName).placeholder = `组名${index + 1}`;
            });
            this.updateGroupDeleteButtons();
        }, this.config.comparison.animation.duration);
    }

    setupGroupButtons() {
        const addGroupBtn = document.getElementById(this.layoutClasses.addGroupBtn);
        if (!addGroupBtn) {
            return;
        }

        addGroupBtn.addEventListener('click', () => {
            const comparison = document.querySelector(this.selectors.characterComparison);
            const groupCount = comparison.querySelectorAll(this.selectors.characterGroup).length;
            const group = this.createGroup(groupCount);

            if (group) {
                comparison.appendChild(group);
                this.updateGroupDeleteButtons();
            }
        });
    }

    addCharacterToGroup(character, group) {
        const groupCharacters = group.querySelector(this.selectors.groupCharacters);

        if (!groupCharacters.querySelector(this.selectors.groupMember)) {
            const clickHandler = this.clickHandlers.get(groupCharacters);
            if (clickHandler) {
                groupCharacters.removeEventListener('click', clickHandler);
                this.clickHandlers.delete(groupCharacters);
            }
        }

        const cardId = `character_${this.cardCounter++}`;
        const card = document.createElement('div');
        card.className = `${this.layoutClasses.groupMember} ${this.animationClasses.init}`;
        card.id = cardId;
        card.innerHTML = `
            <img src="${character.avatar}" alt="${character.name}" title="${character.name}@${character.ip}" class="${this.layoutClasses.characterAvatar}">
        `;

        const existingAddBtn = groupCharacters.querySelector(this.selectors.addCharacterBtn);
        if (existingAddBtn) {
            groupCharacters.insertBefore(card, existingAddBtn);
        } else {
            groupCharacters.appendChild(card);

            const addBtn = document.createElement('div');
            addBtn.className = this.layoutClasses.groupAddCharacterBtn;
            addBtn.innerHTML = '+';
            addBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.showCharacterSelectModal(group);
            });
            groupCharacters.appendChild(addBtn);
        }

        this.characterManager.selectCharacter(cardId, character);

        requestAnimationFrame(() => {
            card.classList.remove(this.animationClasses.init);
        });

        this.updateGroupDeleteButtons();
    }

    updateGroupDeleteButtons() {
        const comparison = document.querySelector(this.selectors.characterComparison);
        const groups = comparison.querySelectorAll(this.selectors.characterGroup);
        const deleteButtons = comparison.querySelectorAll(this.selectors.deleteGroupBtn);

        const compareType = this.getCompareType();
        const isBaseCompareType = compareType === this.comparisonTypes.groupBaseTotalCompare ||
            compareType === this.comparisonTypes.groupBaseAvgCompare;

        deleteButtons.forEach((btn, index) => {
            if (isBaseCompareType && index === 0) {
                btn.style.display = 'none';
            } else {
                btn.style.display = groups.length <= this.config.comparison.groupCompareMinGroups ? 'none' : 'flex';
            }
        });
    }
    searchItemTemplate(character) {
        return `
            <div class="${this.layoutClasses.searchItem}" data-character='${JSON.stringify(character)}'>
                ${character.avatar ? `<img src="${character.avatar}" alt="${character.name}">` : ''}
                <div class="search-info">
                    <div class="name">${character.name}</div>
                    <div class="ip">IP：${character.ip}</div>
                    ${character.cv ? `<div class="cv">CV：${character.cv}</div>` : ''}
                </div>
            </div>
        `;
    }

}
