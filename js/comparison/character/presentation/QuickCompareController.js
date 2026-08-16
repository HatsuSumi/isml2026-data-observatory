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

        if (!button) {
            return;
        }

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

            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error('找不到模态框元素!');
                return;
            }
            modal.classList.add(this.animationClasses.show);

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

            requestAnimationFrame(() => {
                const optionsContainer = document.querySelector(`#${modalId} .${type}-select-options`);
                if (!optionsContainer) {
                    console.error('找不到选项容器!');
                    return;
                }

                optionsContainer.innerHTML = sortedOptions
                    .map(option => `<div class="${optionsClass}" data-value="${option.value}">${option.text}</div>`)
                    .join('');

                const options = optionsContainer.querySelectorAll(`.${optionsClass}`);
                options.forEach(option => {
                    option.addEventListener('click', () => {
                        const text = option.textContent;

                        document.querySelector(`.${type}-select-value`).textContent = text;
                        document.querySelector(`.${type}-select`).classList.remove('active');
                        document.querySelector(`.${type}-modal-btn.confirm`).disabled = false;

                        options.forEach(opt => opt.classList.remove(this.animationClasses.selected));
                        option.classList.add(this.animationClasses.selected);
                    });
                });
            });

            document.querySelector(`.${type}-modal-close`)?.addEventListener('click', () => {
                document.getElementById(modalId)?.classList.remove(this.animationClasses.show);
                document.querySelector(`#${modalId} .${type}-select`)?.classList.remove('active');
                document.querySelector(`.${type}-select-value`).textContent = placeholder;
                document.querySelector(`.${type}-modal-btn.confirm`).disabled = true;
                document.querySelectorAll(`.${optionsClass}`).forEach(opt => opt.classList.remove(this.animationClasses.selected));
            }, { once: true });

            const trigger = document.querySelector(`#${modalId} .${type}-select-trigger`);
            trigger?.addEventListener('click', () => {
                document.querySelector(`#${modalId} .${type}-select`)?.classList.toggle(this.animationClasses.active);
            }, { once: true });

            document.querySelector(`.${type}-modal-btn.confirm`)?.addEventListener('click', () => {
                const selectedValue = document.querySelector(`.${optionsClass}.selected`)?.dataset.value;
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
                document.getElementById(modalId)?.classList.remove(this.animationClasses.show);
            }, { once: true });

            document.querySelector(`.${type}-modal-btn.cancel`)?.addEventListener('click', () => {
                document.getElementById(modalId)?.classList.remove(this.animationClasses.show);
                document.querySelector(`#${modalId} .${type}-select`)?.classList.remove('active');
                document.querySelector(`.${type}-select-value`).textContent = placeholder;
                document.querySelector(`.${type}-modal-btn.confirm`).disabled = true;
                document.querySelectorAll(`.${optionsClass}`).forEach(opt => opt.classList.remove(this.animationClasses.selected));
            }, { once: true });
        });
    }
}
