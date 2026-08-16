export class QuickCompareController {
    constructor({
        characterManager,
        addCharacter,
        compareCharacters,
        selectors,
        layoutClasses,
        comparisonTypes,
        animationClasses,
        messages,
        alertBox
    }) {
        this.characterManager = characterManager;
        this.addCharacter = addCharacter;
        this.compareCharacters = compareCharacters;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.comparisonTypes = comparisonTypes;
        this.animationClasses = animationClasses;
        this.messages = messages;
        this.alertBox = alertBox;
        this.quickCompareState = {
            cv: { selectedValue: null },
            ip: { selectedValue: null }
        };
    }

    initialize() {
        requestAnimationFrame(() => {
            this.setupQuickCompare('cv');
            this.setupQuickCompare('ip');
        });
    }

    updateButtons() {
        const compareType = document.getElementById(this.layoutClasses.compareType).value;
        const cvCompareBtn = document.getElementById(this.layoutClasses.cvCompareBtn);
        const ipCompareBtn = document.getElementById(this.layoutClasses.ipCompareBtn);

        const isOneToOne = compareType === this.comparisonTypes.oneToOne;
        cvCompareBtn.disabled = isOneToOne;
        ipCompareBtn.disabled = isOneToOne;
        cvCompareBtn.classList.toggle(this.animationClasses.disabled, isOneToOne);
        ipCompareBtn.classList.toggle(this.animationClasses.disabled, isOneToOne);
    }

    setupQuickCompare(type) {
        const btnId = type === 'cv' ? this.layoutClasses.cvCompareBtn : this.layoutClasses.ipCompareBtn;
        const modalId = type === 'cv' ? this.layoutClasses.cvModal : this.layoutClasses.ipModal;
        const optionsClass = `${type}-select-option`;
        const placeholder = type === 'cv' ? '请选择声优...' : '请选择IP...';
        const button = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        const select = modal?.querySelector(`.${type}-select`);
        const trigger = modal?.querySelector(`.${type}-select-trigger`);
        const valueElement = modal?.querySelector(`.${type}-select-value`);
        const optionsContainer = modal?.querySelector(`.${type}-select-options`);
        const closeButton = modal?.querySelector(`.${type}-modal-close`);
        const confirmButton = modal?.querySelector(`.${type}-modal-btn.confirm`);
        const cancelButton = modal?.querySelector(`.${type}-modal-btn.cancel`);
        const state = this.quickCompareState[type];

        if (!button || !modal || !select || !trigger || !valueElement || !optionsContainer || !closeButton || !confirmButton || !cancelButton) {
            return;
        }

        const resetModalState = () => {
            state.selectedValue = null;
            select.classList.remove(this.animationClasses.active);
            valueElement.textContent = placeholder;
            confirmButton.disabled = true;
            optionsContainer.querySelectorAll(`.${optionsClass}`).forEach(option => {
                option.classList.remove(this.animationClasses.selected);
            });
        };

        const closeModal = () => {
            modal.classList.remove(this.animationClasses.show);
            resetModalState();
        };

        const renderOptions = () => {
            const stats = new Map();
            this.characterManager.characters.forEach(char => {
                const value = type === 'cv' ? char.cv : char.ip;
                if (value) {
                    stats.set(value, (stats.get(value) || 0) + 1);
                }
            });

            const sortedOptions = Array.from(stats.entries())
                .sort((a, b) => {
                    const countDiff = b[1] - a[1];
                    if (countDiff !== 0) {
                        return countDiff;
                    }
                    return a[0].localeCompare(b[0]);
                })
                .map(([value, count]) => ({
                    value,
                    text: `${value} (${count}位角色)`
                }));

            optionsContainer.innerHTML = sortedOptions
                .map(option => `<div class="${optionsClass}" data-value="${option.value}">${option.text}</div>`)
                .join('');
        };

        button.addEventListener('click', () => {
            const compareType = document.getElementById(this.layoutClasses.compareType).value;
            if (compareType === this.comparisonTypes.baseCompare) {
                const firstCard = document.querySelector(this.selectors.characterCard);
                const input = firstCard?.querySelector(this.selectors.searchInput);

                if (!input?.value) {
                    this.alertBox.show(
                        this.messages.selectBaseCharacter.text,
                        this.messages.selectBaseCharacter.duration,
                        this.messages.selectBaseCharacter.type
                    );
                    return;
                }
            }

            renderOptions();
            resetModalState();
            modal.classList.add(this.animationClasses.show);
        });

        trigger.addEventListener('click', event => {
            event.stopPropagation();
            select.classList.toggle(this.animationClasses.active);
        });

        document.addEventListener('click', event => {
            if (!modal.classList.contains(this.animationClasses.show)) {
                return;
            }
            if (!select.contains(event.target)) {
                select.classList.remove(this.animationClasses.active);
            }
        });

        optionsContainer.addEventListener('click', event => {
            const option = event.target.closest(`.${optionsClass}`);
            if (!option) {
                return;
            }

            state.selectedValue = option.dataset.value;
            valueElement.textContent = option.textContent;
            select.classList.remove(this.animationClasses.active);
            confirmButton.disabled = false;

            optionsContainer.querySelectorAll(`.${optionsClass}`).forEach(item => {
                item.classList.toggle(this.animationClasses.selected, item === option);
            });
        });

        closeButton.addEventListener('click', closeModal);
        cancelButton.addEventListener('click', closeModal);

        confirmButton.addEventListener('click', () => {
            const selectedValue = state.selectedValue;
            if (!selectedValue) {
                return;
            }

            const currentCompareType = document.getElementById(this.layoutClasses.compareType).value;
            const characters = this.characterManager.characters
                .filter(char => type === 'cv' ? char.cv === selectedValue : char.ip === selectedValue)
                .sort((a, b) => parseInt(b.votes || '0', 10) - parseInt(a.votes || '0', 10));

            if (currentCompareType === this.comparisonTypes.baseCompare) {
                document.querySelectorAll(this.selectors.characterCard).forEach((card, index) => {
                    const input = card.querySelector(this.selectors.searchInput);
                    if (index > 0 && (input.value === '' || input.placeholder.startsWith('选择角色'))) {
                        card.remove();
                    }
                });
            } else {
                document.querySelectorAll(this.selectors.characterCard).forEach(card => {
                    const input = card.querySelector(this.selectors.searchInput);
                    if (input.value === '' || input.placeholder.startsWith('选择角色')) {
                        card.remove();
                    }
                });
            }

            characters.forEach(char => {
                this.addCharacter();
                const newCard = document.querySelector(this.selectors.characterCard + ':last-child');
                this.characterManager.selectCharacter(newCard.id, char);
                const input = newCard.querySelector(this.selectors.searchInput);
                input.value = `${char.name}@${char.ip}`;
            });

            this.compareCharacters();
            closeModal();
        });
    }
}
