export class QuickSelectModalController {
    constructor({ characterManager, selectors, animationClasses }) {
        this.characterManager = characterManager;
        this.selectors = selectors;
        this.animationClasses = animationClasses;
    }

    initialize({
        quickSelectBtn,
        quickSelectModal,
        closeQuickSelectBtn,
        quickSelectConfirmBtn,
        quickSelectCancelBtn,
        onApplySelection,
    }) {
        let currentFilteredChars = [];

        quickSelectBtn.addEventListener('click', () => {
            quickSelectModal.classList.add(this.animationClasses.show);
        });

        const resetQuickSelectModal = () => {
            quickSelectModal.querySelectorAll(`${this.selectors.quickSelectDropdown}.${this.animationClasses.open}`).forEach(dropdown => {
                dropdown.classList.remove(this.animationClasses.open);
            });
            quickSelectModal.classList.remove(this.animationClasses.show);
            quickSelectModal.querySelectorAll(this.selectors.selectValue).forEach(value => {
                value.textContent = value.closest(this.selectors.quickSelectDropdown).dataset.type === 'cv' ? '选择声优...' : '选择IP...';
            });
            quickSelectModal.querySelectorAll(this.selectors.quickSelectDropdown).forEach(dropdown => {
                dropdown.classList.remove(this.animationClasses.disabled);
            });
            quickSelectConfirmBtn.disabled = true;
            currentFilteredChars = [];
        };

        closeQuickSelectBtn.addEventListener('click', resetQuickSelectModal);
        quickSelectCancelBtn.addEventListener('click', resetQuickSelectModal);

        quickSelectModal.addEventListener('click', e => {
            if (e.target === quickSelectModal) {
                quickSelectModal.querySelectorAll(`${this.selectors.quickSelectDropdown}.${this.animationClasses.open}`).forEach(dropdown => {
                    dropdown.classList.remove(this.animationClasses.open);
                });
                quickSelectModal.classList.remove(this.animationClasses.show);
            }
        });

        quickSelectModal.querySelectorAll(this.selectors.quickSelectDropdown).forEach(select => {
            const optionsContainer = select.querySelector(this.selectors.quickSelectOptionsList);
            const selectValue = select.querySelector(this.selectors.selectValue);
            const type = select.dataset.type;
            const optionsMap = new Map();

            this.characterManager.characters.forEach(char => {
                const value = type === 'cv' ? char.cv : char.ip;
                if (value) {
                    optionsMap.set(value, (optionsMap.get(value) || 0) + 1);
                }
            });

            const sortedOptions = Array.from(optionsMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([value, count]) => `${value}（${count}位角色）`);

            optionsContainer.innerHTML = sortedOptions.map(option => `
                <div class="quick-select-option" data-value="${option.split('（')[0]}">${option}</div>
            `).join('');

            select.querySelector(this.selectors.quickSelectTrigger).addEventListener('click', () => {
                select.classList.toggle(this.animationClasses.open);
            });

            optionsContainer.querySelectorAll(this.selectors.quickSelectOption).forEach(option => {
                option.addEventListener('click', () => {
                    const value = option.dataset.value;
                    selectValue.textContent = option.textContent;
                    select.classList.remove(this.animationClasses.open);

                    const otherType = type === 'cv' ? 'ip' : 'cv';
                    const otherDropdown = quickSelectModal.querySelector(`${this.selectors.quickSelectDropdown}[data-type="${otherType}"]`);

                    if (value && value !== '选择声优...' && value !== '选择IP...') {
                        otherDropdown.classList.add(this.animationClasses.disabled);
                    } else {
                        otherDropdown.classList.remove(this.animationClasses.disabled);
                    }

                    currentFilteredChars = this.characterManager.characters.filter(char => {
                        if (type === 'cv') {
                            return char.cv && char.cv === value.trim();
                        }
                        if (type === 'ip') {
                            return char.ip === value.trim();
                        }
                        return false;
                    });

                    quickSelectConfirmBtn.disabled = false;
                });
            });
        });

        quickSelectConfirmBtn.addEventListener('click', () => {
            onApplySelection(currentFilteredChars);
            quickSelectModal.classList.remove(this.animationClasses.show);
            currentFilteredChars = [];
        });
    }
}
