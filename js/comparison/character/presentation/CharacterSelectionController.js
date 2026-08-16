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

    cloneTemplate(templateId) {
        const template = document.getElementById(templateId);
        if (!template) throw new Error(`找不到角色选择模板: ${templateId}`);
        return template.content.cloneNode(true).firstElementChild;
    }

    createCharacterCard(character, selected) {
        const card = this.cloneTemplate(this.layoutClasses.characterSelectCardTemplate);
        const avatar = card.querySelector(this.selectors.characterAvatar);
        const autoTag = card.querySelector(`.${this.layoutClasses.autoTag}`);
        avatar.hidden = !character.avatar;
        if (character.avatar) {
            avatar.src = character.avatar;
            avatar.alt = character.name;
        }
        card.querySelector('.name').textContent = character.name;
        card.querySelector('.ip').textContent = character.ip;
        card.querySelector('.cv').textContent = character.cv || '暂无CV';
        autoTag.hidden = character.votes !== '-';
        card.querySelector(this.selectors.checkbox).classList.toggle(this.animationClasses.checked, selected);
        return card;
    }

    renderCharacters(characterGrid, characters, selectedCharacters) {
        if (characters.length === 0) {
            const empty = this.cloneTemplate(this.layoutClasses.emptyCharacterTemplate);
            empty.querySelector('.empty-message').textContent = '没有找到匹配的角色';
            characterGrid.replaceChildren(empty);
            requestAnimationFrame(() => characterGrid.querySelector(this.selectors.emptyTip)?.classList.add(this.animationClasses.show));
            return;
        }

        const selected = characters.filter(char => this.isSelected(selectedCharacters, char));
        const unselected = characters.filter(char => !this.isSelected(selectedCharacters, char));
        const fragment = document.createDocumentFragment();
        [...selected, ...unselected].forEach(character => {
            fragment.append(this.createCharacterCard(character, this.isSelected(selectedCharacters, character)));
        });
        characterGrid.replaceChildren(fragment);
    }

    initialize({ targetGroup, characterGrid, selectedCharacters }) {
        const renderCharacters = characters => {
            const availableCharacters = this.getAvailableCharacters(targetGroup, characters);
            this.renderCharacters(characterGrid, availableCharacters, selectedCharacters);
        };

        const handleCardClick = event => {
            const card = event.target.closest(this.selectors.cardSelect);
            if (!card) return;
            const char = this.findCharacterFromCard(card);
            if (!char) return;

            if (this.isSelected(selectedCharacters, char)) {
                selectedCharacters.delete(char);
                card.querySelector(this.selectors.checkbox)?.classList.remove(this.animationClasses.checked);
                this.removeCharacterFromGroup(targetGroup, char);
                return;
            }

            if (this.existsInOtherGroup(targetGroup, char)) {
                this.alertBox.show(this.messages.characterExists.text, this.messages.characterExists.duration, this.messages.characterExists.type);
                return;
            }
            selectedCharacters.add(char);
            card.querySelector(this.selectors.checkbox)?.classList.add(this.animationClasses.checked);
        };

        characterGrid.addEventListener('click', handleCardClick);
        return { renderCharacters };
    }

    getAvailableCharacters(targetGroup, characters) {
        const existingCharacters = new Set();
        document.querySelectorAll(this.selectors.characterGroup).forEach(group => {
            if (group === targetGroup) return;
            group.querySelectorAll(this.selectors.groupMember).forEach(member => {
                const avatar = member.querySelector(this.selectors.characterAvatar);
                const ip = avatar.title.split('@')[1];
                existingCharacters.add(`${avatar.alt}@${ip}`);
            });
        });
        return characters.filter(char => !existingCharacters.has(`${char.name}@${char.ip}`));
    }

    isSelected(selectedCharacters, char) {
        return Array.from(selectedCharacters).some(selected => selected.name === char.name && selected.cv === char.cv && selected.ip === char.ip);
    }

    findCharacterFromCard(card) {
        return this.characterManager.characters.find(char => char.name === card.querySelector('.name')?.textContent && char.ip === card.querySelector('.ip')?.textContent && (char.cv || '暂无CV') === card.querySelector('.cv')?.textContent);
    }

    existsInOtherGroup(targetGroup, char) {
        return Array.from(document.querySelectorAll(this.selectors.characterGroup)).some(group => {
            if (group === targetGroup) return false;
            return Array.from(group.querySelectorAll(this.selectors.groupMember)).some(member => {
                const avatar = member.querySelector(this.selectors.characterAvatar);
                return char.name === avatar.alt && char.ip === avatar.title.split('@')[1];
            });
        });
    }

    removeCharacterFromGroup(targetGroup, char) {
        const member = targetGroup.querySelector(this.generateSelectors.groupMemberByChar(char))?.parentElement;
        if (!member) return;
        this.characterManager.selectedCharacters.delete(member.id);
        member.remove();
        if (targetGroup.querySelector(this.selectors.groupMember)) return;

        const groupCharacters = targetGroup.querySelector(this.selectors.groupCharacters);
        groupCharacters.querySelector(this.selectors.addCharacterBtn)?.remove();
        const clickHandler = () => {
            if (!groupCharacters.querySelector(this.selectors.groupMember)) this.showCharacterSelectModal(targetGroup);
        };
        groupCharacters.addEventListener('click', clickHandler);
        this.clickHandlers.set(groupCharacters, clickHandler);
    }
}
