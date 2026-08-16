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
        try {
            await this.characterManager.loadEvents();
            const optionsHtml = this.characterManager.getSelectableMatches()
                .map(option => `<div class="option" data-value="${option.value}">${option.name}</div>`)
                .join('');
            document.querySelector(this.selectors.selectOptions).innerHTML = optionsHtml;
        } catch (error) {
            console.error('加载赛事失败:', error);
        }
    }

    initialize() {
        const eventSelect = document.getElementById(this.layoutClasses.eventSelect);
        if (!eventSelect) {
            console.error('角色对比页面缺少赛事选择器');
            return;
        }

        eventSelect.addEventListener('click', async event => {
            const option = event.target.closest(this.selectors.selectOption);
            if (!option) {
                return;
            }

            const trigger = eventSelect.querySelector(this.selectors.selectTrigger);
            trigger.querySelector(this.selectors.selectValue).textContent = option.textContent;
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
        trigger?.addEventListener('click', () => {
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
