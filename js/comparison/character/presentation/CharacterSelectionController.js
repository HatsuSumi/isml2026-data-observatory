export class CharacterSelectionController {
    constructor({
        characterManager,
        clickHandlers,
        selectors,
        layoutClasses,
        animationClasses,
        generateSelectors,
        showCharacterSelectModal,
        alertBox,
        messages,
    }) {
        this.characterManager = characterManager;
        this.clickHandlers = clickHandlers;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.generateSelectors = generateSelectors;
        this.showCharacterSelectModal = showCharacterSelectModal;
        this.alertBox = alertBox;
        this.messages = messages;
    }

    initialize({ targetGroup, characterGrid, selectedCharacters }) {
        const renderCharacters = characters => {
            const availableCharacters = this.getAvailableCharacters(targetGroup, characters);

            if (availableCharacters.length === 0) {
                characterGrid.innerHTML = `
                    <div class="empty-tip">
                        <i class="fas fa-search"></i>
                        <div>没有找到匹配的角色</div>
                    </div>
                `;
                requestAnimationFrame(() => {
                    characterGrid.querySelector(this.selectors.emptyTip)?.classList.add(this.animationClasses.show);
                });
                return;
            }

            const selectedChars = availableCharacters.filter(char => this.isSelected(selectedCharacters, char));
            const unselectedChars = availableCharacters.filter(char => !this.isSelected(selectedCharacters, char));
            const sortedCharacters = [...selectedChars, ...unselectedChars];

            characterGrid.innerHTML = sortedCharacters.map(char => {
                const isSelected = this.isSelected(selectedCharacters, char);

                return `
                    <div class="${this.layoutClasses.cardSelect}">
                        ${char.avatar ? `<img src="${char.avatar}" alt="${char.name}">` : ''}
                        <div class="info">
                            <div class="name">${char.name}</div>
                            <div class="ip">${char.ip}</div>
                            <div class="cv">${char.cv || '暂无CV'}</div>
                            ${char.votes === '-' ? `<div class="auto-tag">自动晋级</div>` : ''}
                        </div>
                        <div class="checkbox${isSelected ? ' checked' : ''}"></div>
                    </div>
                `;
            }).join('');
        };

        const handleCardClick = e => {
            const card = e.target.closest(this.selectors.cardSelect);
            if (!card) {
                return;
            }

            const char = this.findCharacterFromCard(card);
            if (!char) {
                return;
            }

            if (this.isSelected(selectedCharacters, char)) {
                selectedCharacters.delete(char);
                card.querySelector(this.selectors.checkbox)?.classList.remove(this.animationClasses.checked);
                this.removeCharacterFromGroup(targetGroup, char);
                return;
            }

            if (this.existsInOtherGroup(targetGroup, char)) {
                this.alertBox.show(
                    this.messages.characterExists.text,
                    this.messages.characterExists.duration,
                    this.messages.characterExists.type
                );
                return;
            }

            selectedCharacters.add(char);
            card.querySelector(this.selectors.checkbox)?.classList.add(this.animationClasses.checked);
        };

        characterGrid.addEventListener('click', handleCardClick);

        return { renderCharacters };
    }

    getAvailableCharacters(targetGroup, characters) {
        const allGroups = document.querySelectorAll(this.selectors.characterGroup);
        const existingCharacters = new Set();

        allGroups.forEach(group => {
            if (group === targetGroup) {
                return;
            }

            group.querySelectorAll(this.selectors.groupMember).forEach(member => {
                const name = member.querySelector(this.selectors.characterAvatar).alt;
                const ip = member.querySelector(this.selectors.characterAvatar).title.split('@')[1];
                existingCharacters.add(`${name}@${ip}`);
            });
        });

        return characters.filter(char => !existingCharacters.has(`${char.name}@${char.ip}`));
    }

    isSelected(selectedCharacters, char) {
        return Array.from(selectedCharacters).some(selected => (
            selected.name === char.name &&
            selected.cv === char.cv &&
            selected.ip === char.ip
        ));
    }

    findCharacterFromCard(card) {
        return this.characterManager.characters.find(char => (
            char.name === card.querySelector('.name')?.textContent &&
            char.ip === card.querySelector('.ip')?.textContent &&
            (char.cv || '暂无CV') === card.querySelector('.cv')?.textContent
        ));
    }

    existsInOtherGroup(targetGroup, char) {
        const allGroups = document.querySelectorAll(this.selectors.characterGroup);
        return Array.from(allGroups).some(group => {
            if (group === targetGroup) {
                return false;
            }

            const members = group.querySelectorAll(this.selectors.groupMember);
            return Array.from(members).some(member => {
                const name = member.querySelector(this.selectors.characterAvatar).alt;
                const ip = member.querySelector(this.selectors.characterAvatar).title.split('@')[1];
                return char.name === name && char.ip === ip;
            });
        });
    }

    removeCharacterFromGroup(targetGroup, char) {
        const member = targetGroup.querySelector(this.generateSelectors.groupMemberByChar(char))?.parentElement;
        if (!member) {
            return;
        }

        this.characterManager.selectedCharacters.delete(member.id);
        member.remove();

        if (targetGroup.querySelector(this.selectors.groupMember)) {
            return;
        }

        const groupCharacters = targetGroup.querySelector(this.selectors.groupCharacters);
        const addBtn = groupCharacters.querySelector(this.selectors.addCharacterBtn);
        if (addBtn) {
            addBtn.remove();
        }

        const clickHandler = () => {
            if (!groupCharacters.querySelector(this.selectors.groupMember)) {
                this.showCharacterSelectModal(targetGroup);
            }
        };
        groupCharacters.addEventListener('click', clickHandler);
        this.clickHandlers.set(groupCharacters, clickHandler);
    }
}
