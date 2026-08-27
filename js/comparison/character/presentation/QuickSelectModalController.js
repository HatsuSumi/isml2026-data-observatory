export class QuickSelectModalController {
    constructor({ characterManager, selectors, animationClasses, layoutClasses }) {
        this.characterManager = characterManager;
        this.selectors = selectors;
        this.animationClasses = animationClasses;
        this.layoutClasses = layoutClasses;
    }

    createOption(optionText) {
        const template = document.getElementById(this.layoutClasses.quickSelectOptionTemplate);
        if (!template) {
            throw new Error('找不到快速选择选项模板');
        }
        const option = template.content.cloneNode(true).firstElementChild;
        option.dataset.value = optionText.split('（')[0];
        option.textContent = optionText;
        return option;
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
        quickSelectModal.addEventListener('click', event => {
            if (event.target === quickSelectModal) {
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
                if (value) optionsMap.set(value, (optionsMap.get(value) || 0) + 1);
            });

            const sortedOptions = Array.from(optionsMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([value, count]) => `${value}（${count}位角色）`);

            optionsContainer.replaceChildren();
            sortedOptions.forEach(optionText => optionsContainer.append(this.createOption(optionText)));

            select.querySelector(this.selectors.quickSelectTrigger).addEventListener('click', () => {
                const shouldOpen = !select.classList.contains(this.animationClasses.open);
                quickSelectModal.querySelectorAll(this.selectors.quickSelectDropdown).forEach(dropdown => {
                    dropdown.classList.remove(this.animationClasses.open);
                });
                if (shouldOpen) {
                    select.classList.add(this.animationClasses.open);
                }
            });

            optionsContainer.querySelectorAll(this.selectors.quickSelectOption).forEach(option => {
                option.addEventListener('click', () => {
                    const value = option.dataset.value;
                    selectValue.textContent = option.textContent;
                    select.classList.remove(this.animationClasses.open);
                    const otherType = type === 'cv' ? 'ip' : 'cv';
                    const otherDropdown = quickSelectModal.querySelector(`${this.selectors.quickSelectDropdown}[data-type="${otherType}"]`);
                    otherDropdown.classList.toggle(this.animationClasses.disabled, Boolean(value));
                    currentFilteredChars = this.characterManager.characters.filter(char => type === 'cv'
                        ? char.cv === value.trim()
                        : char.ip === value.trim());
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
