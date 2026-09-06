export class EventSelectionController {
    constructor({
        characterManager,
        selectors,
        layoutClasses,
        animationClasses,
        comparisonTypes,
        compareTypes,
        config,
        alertBox,
        messages,
        resetExceptEvent,
        updateDeleteButtons,
        setupDragAndDrop
    }) {
        this.characterManager = characterManager;
        this.selectors = selectors;
        this.layoutClasses = layoutClasses;
        this.animationClasses = animationClasses;
        this.comparisonTypes = comparisonTypes;
        this.compareTypes = compareTypes;
        this.config = config;
        this.alertBox = alertBox;
        this.messages = messages;
        this.resetExceptEvent = resetExceptEvent;
        this.updateDeleteButtons = updateDeleteButtons;
        this.setupDragAndDrop = setupDragAndDrop;
    }

    async loadEvents() {
        await this.characterManager.loadEvents();
        const matches = this.characterManager.getSelectableMatches();
        const optionsHtml = matches
            .map(option => `<div class="option" data-value="${option.value}">${option.name}</div>`)
            .join('');
        const selectOptions = document.querySelector(this.selectors.selectOptions);
        if (!selectOptions) {
            throw new Error('角色对比初始化失败：找不到赛事下拉容器');
        }
        selectOptions.innerHTML = optionsHtml;
    }

    initialize() {
        const eventSelect = document.getElementById(this.layoutClasses.eventSelect);
        if (!eventSelect) {
            throw new Error('角色对比初始化失败：缺少赛事选择器');
        }

        eventSelect.addEventListener('click', async event => {
            const option = event.target.closest(this.selectors.selectOption);
            if (!option) {
                return;
            }

            const trigger = eventSelect.querySelector(this.selectors.selectTrigger);
            if (!trigger) {
                throw new Error('角色对比初始化失败：缺少赛事选择器触发器');
            }
            const value = trigger.querySelector(this.selectors.selectValue);
            if (!value) {
                throw new Error('角色对比初始化失败：缺少赛事选择器文本容器');
            }
            value.textContent = option.textContent;
            eventSelect.querySelectorAll(this.selectors.selectOption)
                .forEach(item => item.classList.remove(this.animationClasses.selected));
            option.classList.add(this.animationClasses.selected);
            eventSelect.classList.remove(this.animationClasses.open);

            await this.handleChange(option.dataset.value);

            document.querySelectorAll(this.selectors.characterCard).forEach(card => {
                card.draggable = true;
            });
            this.characterManager.reset();
            document.querySelectorAll(`${this.selectors.characterCard} ${this.selectors.searchInput}`)
                .forEach(input => { input.value = ''; });
            this.updateDeleteButtons();
        });

        const trigger = eventSelect.querySelector(this.selectors.selectTrigger);
        if (!trigger) {
            throw new Error('角色对比初始化失败：缺少赛事选择器触发器');
        }
        trigger.addEventListener('click', () => {
            eventSelect.classList.toggle(this.animationClasses.open);
        });

        document.addEventListener('click', event => {
            if (!eventSelect.contains(event.target)) {
                eventSelect.classList.remove(this.animationClasses.open);
            }
        });

        eventSelect.addEventListener('change', () => {
            const cards = document.querySelectorAll(this.selectors.characterCard);
            cards.forEach(card => {
                card.draggable = eventSelect.value !== '';
            });
            if (eventSelect.value !== '') {
                this.setupDragAndDrop();
            }
        });
    }

    async handleChange(eventId) {
        if (!eventId) {
            this.alertBox.show(
                this.messages.selectEvent.text,
                this.messages.selectEvent.duration,
                this.messages.selectEvent.type
            );
            return;
        }

        try {
            this.resetExceptEvent();
            await this.characterManager.loadCharacters(eventId);
            this.updateCompareTypeVisibility(eventId);
            this.updateTotalVotes(eventId);
        } catch (error) {
            this.alertBox.show(
                error.message,
                this.messages.loadError.duration,
                this.messages.loadError.type
            );
        }
    }

    updateCompareTypeVisibility(eventId) {
        const compareTypeSelect = document.getElementById(this.layoutClasses.compareType);
        const compareTypeWrapper = document.querySelector(this.selectors.compareTypeWrapper);
        const isNomination = eventId.split('/')[0] === this.config.stages.nomination;

        this.compareTypes.forEach(type => {
            const option = compareTypeSelect.querySelector(`option[value="${type}"]`);
            if (option) {
                option.style.display = isNomination ? 'block' : 'none';
            }
        });

        if (isNomination) {
            compareTypeWrapper.classList.add(this.animationClasses.show);
            return;
        }

        if (compareTypeSelect.value !== this.comparisonTypes.oneToOne) {
            compareTypeSelect.value = this.comparisonTypes.oneToOne;
        }
    }

    updateTotalVotes(eventId) {
        const event = this.characterManager.getEventStats(eventId);
        if (!event?.stats?.votes) {
            return;
        }

        document.querySelector(this.selectors.totalVotesValue).textContent = event.stats.votes.total;
        document.querySelector(this.selectors.totalVotesValid).textContent = `（有效：${event.stats.votes.valid}）`;
    }
}
