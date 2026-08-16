export class CompareTypeController {
    constructor({
        selectors,
        layoutClasses,
        animationClasses,
        comparisonTypes,
        config,
        groupCompareTypes,
        onReset,
        onUpdateQuickCompareButtons,
        onChange,
    }) {
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.comparisonTypes = comparisonTypes;
        this.config = config;
        this.groupCompareTypes = groupCompareTypes;
        this.onReset = onReset;
        this.onUpdateQuickCompareButtons = onUpdateQuickCompareButtons;
        this.onChange = onChange;
    }

    initialize() {
        const compareTypeSelect = document.getElementById(this.layoutClasses.compareType);
        const compareTypeCustom = document.getElementById('compareTypeCustom');
        const compareTypeTrigger = compareTypeCustom?.querySelector('.select-trigger');
        const compareTypeValue = compareTypeCustom?.querySelector('.select-value');
        const compareTypeOptions = compareTypeCustom?.querySelector('.select-options');

        if (!compareTypeSelect || !compareTypeCustom || !compareTypeTrigger || !compareTypeValue || !compareTypeOptions) {
            return;
        }

        const compareTypeOptionsData = [
            { value: this.comparisonTypes.oneToOne, text: '一对一对比' },
            { value: this.comparisonTypes.baseCompare, text: '和基准角色对比（一对多）' },
            { value: this.comparisonTypes.avgCompare, text: '取平均值对比（一对多）' },
            { value: this.comparisonTypes.groupBaseTotalCompare, text: '组基准总票数对比（多对多）' },
            { value: this.comparisonTypes.groupBaseAvgCompare, text: '组基准平均值对比（多对多）' },
            { value: this.comparisonTypes.groupTotalCompare, text: '组总票数对比（多对多）' },
            { value: this.comparisonTypes.groupAvgCompare, text: '组平均值对比（多对多）' },
            { value: this.comparisonTypes.about, text: '不知道选哪种对比？' }
        ];

        compareTypeOptions.innerHTML = compareTypeOptionsData
            .map(option => `<div class="option" data-value="${option.value}">${option.text}</div>`)
            .join('');

        const syncCompareTypeCustom = value => {
            const option = compareTypeOptions.querySelector(`.option[data-value="${value}"]`);
            compareTypeValue.textContent = option?.textContent || compareTypeOptionsData[0].text;
            compareTypeOptions.querySelectorAll('.option').forEach(item => {
                item.classList.toggle(this.animationClasses.selected, item.dataset.value === value);
            });
        };

        compareTypeSelect.addEventListener('change', () => {
            const value = compareTypeSelect.value;
            const previousValue = compareTypeSelect.dataset.previousValue || value;
            compareTypeSelect.dataset.previousValue = value;
            this.onReset();
            this.onChange(compareTypeSelect, previousValue);
            this.updateComparisonModeControls(value);
            syncCompareTypeCustom(value);
        });

        const setOpen = isOpen => {
            compareTypeCustom.classList.toggle(this.animationClasses.open, isOpen);
            compareTypeTrigger.setAttribute('aria-expanded', String(isOpen));
        };

        compareTypeTrigger.addEventListener('click', () => {
            setOpen(!compareTypeCustom.classList.contains(this.animationClasses.open));
        });

        compareTypeOptions.addEventListener('click', e => {
            const option = e.target.closest('.option');
            if (!option) {
                return;
            }

            const value = option.dataset.value;
            if (value === this.comparisonTypes.about) {
                setOpen(false);
                window.open('pages/comparison/comparison-guide.html', '_blank');
                return;
            }

            compareTypeSelect.value = value;
            compareTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            syncCompareTypeCustom(value);
            setOpen(false);
        });

        document.addEventListener('click', e => {
            if (!compareTypeCustom.contains(e.target)) {
                setOpen(false);
            }
        });

        syncCompareTypeCustom(compareTypeSelect.value || this.comparisonTypes.oneToOne);
    }

    updateComparisonModeControls(compareType) {
        const comparison = document.querySelector(this.selectors.characterComparison);
        const addCharacterBtn = document.getElementById(this.layoutClasses.addCharacterBtn);
        const addGroupBtn = document.getElementById(this.layoutClasses.addGroupBtn);
        const quickCompareSection = document.getElementById(this.layoutClasses.quickCompareSection);
        const isGroupMode = this.groupCompareTypes.has(compareType);

        comparison.classList.toggle(this.layoutClasses.oneToManyLayout, compareType === this.comparisonTypes.baseCompare);
        this.syncOneToManyLayoutClass(comparison, compareType);
        addCharacterBtn.style.display = isGroupMode ? 'none' : 'flex';
        addGroupBtn.style.display = isGroupMode ? 'flex' : 'none';
        quickCompareSection.style.display = isGroupMode ? 'none' : 'flex';
        this.onUpdateQuickCompareButtons();
    }

    syncOneToManyLayoutClass(comparison, compareType) {
        const cards = comparison.querySelectorAll(this.selectors.characterCard);
        const divider = comparison.querySelector(this.selectors.divider);
        const isBaseCompare = compareType === this.comparisonTypes.baseCompare;
        const isTwoCompareCards = isBaseCompare && cards.length === this.config.comparison.baseCompareMinCards;

        comparison.classList.toggle(this.layoutClasses.twoChars, isTwoCompareCards);

        if (!divider) {
            return;
        }

        divider.classList.toggle(this.animationClasses.hidden, !isBaseCompare);
        if (isBaseCompare && cards.length > 0) {
            cards[0].after(divider);
        }
    }
}
