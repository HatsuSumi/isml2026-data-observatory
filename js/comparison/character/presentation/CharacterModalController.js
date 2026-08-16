export class CharacterModalController {
    constructor({
        characterManager,
        selectors,
        layoutClasses,
        animationClasses,
        config,
        debounce,
        quickSelectModalController,
        characterSelectionController,
        characterSelectModalShellController,
        addCharacterToGroup,
        searchCharacters
    }) {
        this.characterManager = characterManager;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.config = config;
        this.debounce = debounce;
        this.quickSelectModalController = quickSelectModalController;
        this.characterSelectionController = characterSelectionController;
        this.characterSelectModalShellController = characterSelectModalShellController;
        this.addCharacterToGroup = addCharacterToGroup;
        this.searchCharacters = searchCharacters;
    }

    open(targetGroup) {
        const template = document.getElementById(this.layoutClasses.characterSelectModal);
        if (!template) {
            return;
        }

        const modal = template.content.cloneNode(true).firstElementChild;
        document.body.appendChild(modal);

        const searchInput = modal.querySelector(this.selectors.searchInput);
        const characterGrid = modal.querySelector(this.selectors.characterGrid);
        const closeBtn = modal.querySelector(this.selectors.closeModalBtn);
        const confirmBtn = modal.querySelector(this.selectors.confirmBtn);
        const cancelBtn = modal.querySelector(this.selectors.cancelBtn);
        const quickSelectBtn = modal.querySelector(this.selectors.quickSelectBtn);
        const quickSelectModal = modal.querySelector(this.selectors.quickSelectModal);
        const closeQuickSelectBtn = modal.querySelector(this.selectors.closeQuickSelectBtn);
        const quickSelectConfirmBtn = quickSelectModal.querySelector(this.selectors.quickSelectConfirmBtn);
        const quickSelectCancelBtn = quickSelectModal.querySelector(this.selectors.quickSelectCancelBtn);
        const selectedCharacters = this.getExistingCharacters(targetGroup);

        const { renderCharacters } = this.characterSelectionController.initialize({
            targetGroup,
            characterGrid,
            selectedCharacters
        });

        this.quickSelectModalController.initialize({
            quickSelectBtn,
            quickSelectModal,
            closeQuickSelectBtn,
            quickSelectConfirmBtn,
            quickSelectCancelBtn,
            onApplySelection: characters => {
                characters.forEach(character => selectedCharacters.add(character));
                renderCharacters(this.characterManager.characters);
            }
        });

        renderCharacters(this.characterManager.characters);
        searchInput.addEventListener('input', this.debounce(() => {
            const keyword = searchInput.value.trim();
            renderCharacters(keyword
                ? this.searchCharacters(keyword)
                : this.characterManager.characters);
        }, this.config.comparison.debounce.delay));

        this.characterSelectModalShellController.initialize({
            modal,
            closeBtn,
            cancelBtn,
            confirmBtn,
            onConfirm: () => this.confirmSelection(targetGroup, selectedCharacters)
        });
    }

    getExistingCharacters(targetGroup) {
        const selectedCharacters = new Set();
        targetGroup.querySelectorAll(this.selectors.groupMember).forEach(member => {
            const avatar = member.querySelector(this.selectors.characterAvatar);
            const [name, ip] = avatar.title.split('@');
            const character = this.characterManager.characters.find(item =>
                item.name === (avatar.alt || name) && item.ip === ip
            );
            if (character) {
                selectedCharacters.add(character);
            }
        });
        return selectedCharacters;
    }

    confirmSelection(targetGroup, selectedCharacters) {
        if (targetGroup.classList.contains(this.animationClasses.error)) {
            const allAreAuto = Array.from(selectedCharacters).every(character => character.votes === '-');
            if (!allAreAuto) {
                targetGroup.classList.remove(this.animationClasses.error);
            }
        }

        const existingMembers = new Set(
            Array.from(targetGroup.querySelectorAll(this.selectors.groupMember)).map(member => {
                const avatar = member.querySelector(this.selectors.characterAvatar);
                return `${avatar.alt}@${avatar.title.split('@')[1]}`;
            })
        );

        selectedCharacters.forEach(character => {
            if (character && !existingMembers.has(`${character.name}@${character.ip}`)) {
                this.addCharacterToGroup(character, targetGroup);
            }
        });
    }
}
