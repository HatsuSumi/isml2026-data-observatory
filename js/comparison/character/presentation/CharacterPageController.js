import {
    CONFIG,
    MESSAGES,
    COMPARISON_TYPES,
    ANIMATION_CLASSES,
    LAYOUT_CLASSES,
    SELECTORS,
    generateSelectors
} from '../../../common/config.js';
import { CharacterComparisonService, createCharacterComparisonStrategies } from '../service/CharacterComparisonService.js';
import { ComparisonController } from './ComparisonController.js';
import { ComparisonResultRenderer } from '../rendering/ComparisonResultRenderer.js';
import { CharacterManager } from '../service/CharacterManager.js';
import { QuickCompareController } from './QuickCompareController.js';
import { CompareTypeController } from './CompareTypeController.js';
import { GroupController } from './GroupController.js';
import { QuickSelectModalController } from './QuickSelectModalController.js';
import { CharacterSelectionController } from './CharacterSelectionController.js';
import { CharacterSelectModalShellController } from './CharacterSelectModalShellController.js';
import { ResetController } from './ResetController.js';
import { CharacterCardController } from './CharacterCardController.js';
import { ComparisonResultGenerator } from '../rendering/ComparisonResultGenerator.js';
import { EventSelectionController } from './EventSelectionController.js';
import { CharacterModalController } from './CharacterModalController.js';
import { ComparisonActionsController } from './ComparisonActionsController.js';
import { ComparisonInputCollector } from './ComparisonInputCollector.js';
class AlertBox {
    static show(message, duration = CONFIG.alert.duration.normal, type = LAYOUT_CLASSES.alertInfo) {

        const existingAlert = document.querySelector(SELECTORS.alertBox);
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertBox = document.createElement('div');
        alertBox.className = `${LAYOUT_CLASSES.alertBox} ${type}`;
        alertBox.textContent = message;
        document.body.appendChild(alertBox);

        requestAnimationFrame(() => {
            alertBox.classList.add(ANIMATION_CLASSES.show);
        });

        setTimeout(() => {
            alertBox.classList.remove(ANIMATION_CLASSES.show);
            setTimeout(() => alertBox.remove(), CONFIG.alert.animation.duration);
        }, duration);
    }
}

export class CharacterPageController {
    static groupCompareTypes = new Set([
        COMPARISON_TYPES.groupBaseTotalCompare,
        COMPARISON_TYPES.groupBaseAvgCompare,
        COMPARISON_TYPES.groupTotalCompare,
        COMPARISON_TYPES.groupAvgCompare,
    ]);

    static compareTypes = [
        COMPARISON_TYPES.baseCompare,
        COMPARISON_TYPES.avgCompare,
        ...CharacterPageController.groupCompareTypes
    ];

    constructor(characterManager) {
        this.characterManager = characterManager;
        this.searchInputDebouncers = new WeakMap();
        this.clickHandlers = new WeakMap();
        this.comparisonService = new CharacterComparisonService({ strategies: createCharacterComparisonStrategies() });
        this.resultRenderer = new ComparisonResultRenderer({ generator: ComparisonResultGenerator });
        this.comparisonController = new ComparisonController({
            state: this.characterManager.state,
            comparisonService: this.comparisonService,
            renderer: this.resultRenderer
        });
        this.comparisonInputCollector = new ComparisonInputCollector({
            selectors: SELECTORS,
            groupCompareTypes: CharacterPageController.groupCompareTypes
        });
        this.comparisonActionsController = new ComparisonActionsController({
            characterManager: this.characterManager,
            comparisonInputCollector: this.comparisonInputCollector,
            comparisonController: this.comparisonController,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            config: CONFIG,
            groupCompareTypes: CharacterPageController.groupCompareTypes,
            messages: MESSAGES,
            alertBox: AlertBox
        });
        this.eventSelectionController = new EventSelectionController({
            characterManager: this.characterManager,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            compareTypes: CharacterPageController.compareTypes,
            config: CONFIG,
            alertBox: AlertBox,
            messages: MESSAGES,
            resetExceptEvent: this.resetExceptEvent.bind(this),
            updateDeleteButtons: this.updateDeleteButtons.bind(this),
            setupDragAndDrop: this.setupDragAndDrop.bind(this)
        });
        this.quickCompareController = new QuickCompareController({
            characterManager: this.characterManager,
            addCharacter: this.addCharacter.bind(this),
            compareCharacters: this.compareCharacters.bind(this),
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            animationClasses: ANIMATION_CLASSES,
            messages: MESSAGES,
            alertBox: AlertBox
        });
        this.compareTypeController = new CompareTypeController({
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            config: CONFIG,
            groupCompareTypes: CharacterPageController.groupCompareTypes,
            onReset: this.reset.bind(this),
            onUpdateQuickCompareButtons: this.updateQuickCompareButtons.bind(this),
            onChange: this.handleCompareTypeChange.bind(this)
        });
        this.groupController = new GroupController({
            characterManager: this.characterManager,
            clickHandlers: this.clickHandlers,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            config: CONFIG,
            showCharacterSelectModal: this.showCharacterSelectModal.bind(this),
            getCompareType: () => document.getElementById(LAYOUT_CLASSES.compareType).value,
            searchCharacters: keyword => this.characterManager.searchCharacters(keyword),
            alertBox: AlertBox,
            messages: MESSAGES
        });
        this.characterCardController = new CharacterCardController({
            characterManager: this.characterManager,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            config: CONFIG,
            comparisonTypes: COMPARISON_TYPES,
            messages: MESSAGES,
            alertBox: AlertBox,
            debounce: this.debounce.bind(this),
            searchItemTemplate,
            getCompareType: () => document.getElementById(LAYOUT_CLASSES.compareType).value,
            calculateZIndex: this.calculateZIndex.bind(this),
            updateDeleteButtons: this.updateDeleteButtons.bind(this),
            compareCharacters: this.compareCharacters.bind(this),
            syncLayout: this.syncOneToManyLayoutClass.bind(this),
            deleteCharacter: this.deleteCharacter.bind(this)
        });
        this.quickSelectModalController = new QuickSelectModalController({
            characterManager: this.characterManager,
            selectors: SELECTORS,
            animationClasses: ANIMATION_CLASSES,
            layoutClasses: LAYOUT_CLASSES
        });
        this.characterSelectionController = new CharacterSelectionController({
            characterManager: this.characterManager,
            clickHandlers: this.clickHandlers,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            generateSelectors,
            showCharacterSelectModal: this.showCharacterSelectModal.bind(this),
            alertBox: AlertBox,
            messages: MESSAGES
        });
        this.characterSelectModalShellController = new CharacterSelectModalShellController({
            animationClasses: ANIMATION_CLASSES,
            config: CONFIG
        });
        this.characterModalController = new CharacterModalController({
            characterManager: this.characterManager,
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            config: CONFIG,
            debounce: this.debounce.bind(this),
            quickSelectModalController: this.quickSelectModalController,
            characterSelectionController: this.characterSelectionController,
            characterSelectModalShellController: this.characterSelectModalShellController,
            addCharacterToGroup: this.addCharacterToGroup.bind(this),
            searchCharacters: keyword => this.characterManager.searchCharacters(keyword)
        });
        this.resetController = new ResetController({
            selectors: SELECTORS,
            layoutClasses: LAYOUT_CLASSES,
            animationClasses: ANIMATION_CLASSES,
            comparisonTypes: COMPARISON_TYPES,
            config: CONFIG,
            groupCompareTypes: CharacterPageController.groupCompareTypes,
            createGroup: this.createGroup.bind(this),
            addCharacter: this.addCharacter.bind(this),
            unbindGroupEvents: this.unbindGroupEvents.bind(this),
            resetCharacterManager: this.characterManager.reset.bind(this.characterManager),
            updateDeleteButtons: this.updateDeleteButtons.bind(this),
            resetCardContent: this.resetCardContent.bind(this)
        });
        this.createGroup = this.createGroup.bind(this);
        this.deleteGroup = this.deleteGroup.bind(this);
        this.compareCharacters = this.compareCharacters.bind(this);
        this.showCharacterSelectModal = this.showCharacterSelectModal.bind(this);
        this.handleCharacterSearch = this.handleCharacterSearch.bind(this);
        this.setupCompareTypeSelect();
        this.eventSelectionController.initialize();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.updateQuickCompareButtons();
        this.setupQuickCompareButtons();
        this.setupGroupButtons();
        this.eventSelectionController.loadEvents();
    }

    createGroup(index) {
        return this.groupController.createGroup(index);
    }

    handleGroupSearch(input, group) {
        this.groupController.handleGroupSearch(input, group);
    }

    setupQuickCompareButtons() {
        this.quickCompareController.initialize();
    }

    setupCompareTypeSelect() {
        this.compareTypeController.initialize();
    }

    updateComparisonModeControls(compareType) {
        this.compareTypeController.updateComparisonModeControls(compareType);
    }

    syncOneToManyLayoutClass(comparison, compareType) {
        this.compareTypeController.syncOneToManyLayoutClass(comparison, compareType);
    }

    updateQuickCompareButtons() {
        this.quickCompareController.updateButtons();
    }

    setupGroupButtons() {
        this.groupController.setupGroupButtons();
    }

    handleCompareTypeChange(compareTypeSelect, previousMode) {
        const comparison = document.querySelector(SELECTORS.characterComparison);
        const addCharacterBtn = document.getElementById(LAYOUT_CLASSES.addCharacterBtn);
        const addGroupBtn = document.getElementById(LAYOUT_CLASSES.addGroupBtn);
        const quickCompareSection = document.getElementById(LAYOUT_CLASSES.quickCompareSection);
        const groupCompareTypes = CharacterPageController.groupCompareTypes;
        const targetMode = compareTypeSelect.value;
        const currentMode = previousMode || targetMode;

        if (targetMode === COMPARISON_TYPES.about) {
            compareTypeSelect.value = previousMode || COMPARISON_TYPES.oneToOne;
            window.open('pages/comparison/character-comparison-guide.html', '_blank');
            return;
        }

        compareTypeSelect.blur();
        compareTypeSelect.dataset.previousValue = targetMode;
        this.resetExceptEvent();

        if (groupCompareTypes.has(currentMode)) {
            comparison.querySelectorAll(SELECTORS.characterGroup).forEach(group => group.remove());
            const targetCardCount = targetMode === COMPARISON_TYPES.avgCompare
                ? CONFIG.comparison.baseCompareMinCards
                : CONFIG.comparison.initialCards;
            for (let index = 0; index < targetCardCount; index += 1) {
                this.addCharacter(index);
            }
        }

        if (targetMode === COMPARISON_TYPES.baseCompare) {
            comparison.classList.add(LAYOUT_CLASSES.oneToManyLayout);
            while (comparison.querySelectorAll(SELECTORS.characterCard).length < CONFIG.comparison.baseCompareMinCards) {
                this.addCharacter();
            }

            const cards = Array.from(comparison.querySelectorAll(SELECTORS.characterCard));
            const cardCount = cards.length;
            const divider = document.createElement('div');
            divider.className = LAYOUT_CLASSES.divider;
            comparison.innerHTML = '';
            comparison.append(cards[0], divider, ...cards.slice(1));
            addCharacterBtn.innerHTML = '<i class="fas fa-plus"></i>\u6dfb\u52a0\u5bf9\u6bd4\u89d2\u8272';
            while (comparison.querySelectorAll(SELECTORS.characterCard).length > CONFIG.comparison.initialCards) {
                comparison.querySelector(SELECTORS.characterCard + ':last-child').remove();
            }
            while (comparison.querySelectorAll(SELECTORS.characterCard).length < CONFIG.comparison.baseCompareMinCards) {
                this.addCharacter();
            }
            comparison.classList.toggle(LAYOUT_CLASSES.twoChars, cardCount === CONFIG.comparison.twoCharsCount);
            this.setupDragAndDrop();
        } else if (groupCompareTypes.has(targetMode)) {
            comparison.classList.remove(LAYOUT_CLASSES.oneToManyLayout, LAYOUT_CLASSES.twoChars);
            comparison.innerHTML = '';
            for (let index = 0; index < CONFIG.comparison.groupCompareMinGroups; index += 1) {
                const group = this.createGroup(index);
                if (group) comparison.appendChild(group);
            }
            this.updateGroupDeleteButtons();
        } else {
            comparison.classList.remove(LAYOUT_CLASSES.oneToManyLayout, LAYOUT_CLASSES.twoChars);
            addCharacterBtn.innerHTML = '<i class="fas fa-plus"></i>\u6dfb\u52a0\u89d2\u8272';
            if (targetMode === COMPARISON_TYPES.oneToOne) {
                while (comparison.querySelectorAll(SELECTORS.characterCard).length > CONFIG.comparison.initialCards) {
                    comparison.querySelector(SELECTORS.characterCard + ':last-child').remove();
                }
            }
            if (targetMode === COMPARISON_TYPES.avgCompare) {
                while (comparison.querySelectorAll(SELECTORS.characterCard).length > CONFIG.comparison.baseCompareMinCards) {
                    comparison.querySelector(SELECTORS.characterCard + ':last-child').remove();
                }
                while (comparison.querySelectorAll(SELECTORS.characterCard).length < CONFIG.comparison.baseCompareMinCards) {
                    this.addCharacter();
                }
            }
        }

        addCharacterBtn.style.display = groupCompareTypes.has(targetMode) ? 'none' : 'flex';
        addGroupBtn.style.display = groupCompareTypes.has(targetMode) ? 'flex' : 'none';
        quickCompareSection.style.display = groupCompareTypes.has(targetMode) ? 'none' : 'flex';
        this.updateDeleteButtons();
        this.updateQuickCompareButtons();
    }

    setupEventListeners() {
        const compareTypeSelect = document.getElementById(LAYOUT_CLASSES.compareType);
        const addBtn = document.getElementById(LAYOUT_CLASSES.addCharacterBtn);
        const resultContainer = document.getElementById(LAYOUT_CLASSES.comparisonResult);

        if (!compareTypeSelect || !addBtn || !resultContainer) {
            console.error('角色对比页面缺少必要的交互元素');
            return;
        }

        const resetBtn = document.getElementById(LAYOUT_CLASSES.resetBtn);
        const compareBtn = document.getElementById(LAYOUT_CLASSES.compareBtn);
        if (!resetBtn || !compareBtn) {
            console.error('角色对比页面缺少操作按钮');
            return;
        }

        const comparisonContainer = document.querySelector(SELECTORS.characterComparison);
        if (!comparisonContainer) {
            console.error('角色对比页面缺少角色卡容器');
            return;
        }

        comparisonContainer.addEventListener('input', event => {
            const input = event.target.closest(`${SELECTORS.characterCard} ${SELECTORS.searchInput}`);
            if (!input || !comparisonContainer.contains(input)) return;

            let debouncedSearch = this.searchInputDebouncers.get(input);
            if (!debouncedSearch) {
                debouncedSearch = this.debounce(target => this.handleSearch(target), CONFIG.comparison.debounce.delay);
                this.searchInputDebouncers.set(input, debouncedSearch);
            }
            debouncedSearch(input);
        });

        comparisonContainer.addEventListener('focusin', event => {
            const input = event.target.closest(`${SELECTORS.characterCard} ${SELECTORS.searchInput}`);
            if (input && comparisonContainer.contains(input)) this.handleFocus(input);
        });

        comparisonContainer.addEventListener('keydown', event => {
            const input = event.target.closest(`${SELECTORS.characterCard} ${SELECTORS.searchInput}`);
            if (input && comparisonContainer.contains(input)) this.handleKeydown(event);
        });


        document.addEventListener('click', e => {
            document.querySelectorAll(SELECTORS.characterCard).forEach(card => {
                const resultsContainer = card.querySelector(SELECTORS.searchResults);
                if (resultsContainer && !card.contains(e.target)) {
                    resultsContainer.classList.add(ANIMATION_CLASSES.hidden);
                }
            });
        });

        document.getElementById(LAYOUT_CLASSES.addCharacterBtn).addEventListener('click', () => this.addCharacter());
        compareBtn.addEventListener('click', () => this.compareCharacters());
        resetBtn.addEventListener('click', () => this.reset());

        resultContainer.addEventListener('click', event => {
            const deleteButton = event.target.closest(`${SELECTORS.charInfoCard} ${SELECTORS.deleteBtn}`);
            if (!deleteButton || !resultContainer.contains(deleteButton)) return;
            event.stopPropagation();
            this.deleteCharacter(deleteButton.closest(SELECTORS.charInfoCard), true);
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    calculateZIndex(index, compareType) {
        if (compareType === COMPARISON_TYPES.baseCompare) {
            if (index === 0) return '';
            return CONFIG.comparison.zIndex.base - Math.floor((index - 1) / CONFIG.comparison.cardBatchSize);
        } else {
            return CONFIG.comparison.zIndex.base - Math.floor(index / CONFIG.comparison.cardBatchSize);
        }
    }

    unbindGroupEvents(group) {
        const groupCharacters = group.querySelector(SELECTORS.groupCharacters);
        const clickHandler = this.clickHandlers.get(groupCharacters);
        if (!clickHandler) return;

        groupCharacters.removeEventListener('click', clickHandler);
        this.clickHandlers.delete(groupCharacters);
    }

    resetCardContent(card, index) {
        const input = card.querySelector(SELECTORS.searchInput);
        const results = card.querySelector(SELECTORS.searchResults);

        if (input) {
            input.value = '';
            input.placeholder = `选择角色${index + 1}...`;
        }
        if (results) {
            results.innerHTML = '';
            results.classList.add(ANIMATION_CLASSES.hidden);
        }

        card.classList.remove(
            ANIMATION_CLASSES.dragging,
            ANIMATION_CLASSES.dragOver,
            ANIMATION_CLASSES.deleting
        );
        card.draggable = false;
    }

    reset() {
        this.resetController.reset();
    }

    resetExceptEvent() {
        this.resetController.resetExceptEvent();
    }

    updateDeleteButtons() {
        const compareType = document.getElementById(LAYOUT_CLASSES.compareType).value;
        const cards = document.querySelectorAll(SELECTORS.characterCard);

        cards.forEach(card => {
            const deleteBtn = card.querySelector(SELECTORS.deleteBtn);
            if (!deleteBtn) return;

            const minRequired = compareType === COMPARISON_TYPES.oneToOne
                ? CONFIG.comparison.initialCards
                : compareType === COMPARISON_TYPES.avgCompare
                    ? CONFIG.comparison.minAvgCharacters
                    : CONFIG.comparison.minBaseCharacters;
            deleteBtn.style.display = cards.length > minRequired ? '' : 'none';
        });
    }

    selectCharacter(cardId, character) {
        this.characterCardController.selectCharacter(cardId, character);
    }

    setupDragAndDrop() {
        this.characterCardController.setupDragAndDrop();
    }

    swapCards(card1, card2) {
        this.characterCardController.swapCards(card1, card2);
    }

    async handleSearch(input) {
        return this.characterCardController.handleSearch(input);
    }

    addCharacter(existingCardCount = null) {
        this.characterCardController.addCharacter(existingCardCount);
    }

    compareCharacters() {
        this.comparisonActionsController.compare();
    }

    handleFocus(input) {
        this.characterCardController.handleFocus(input);
    }

    handleKeydown(e) {
        this.characterCardController.handleKeydown(e);
    }

    deleteCharacter(cardElement, isComparisonResult = false) {
        this.characterCardController.deleteCharacter(cardElement, isComparisonResult);
    }

    updateQuickCompareButtons() {
        this.quickCompareController.updateButtons();
    }

    setupGroupButtons() {
        this.groupController.setupGroupButtons();
    }

    deleteGroup(group) {
        this.groupController.deleteGroup(group);
    }

    showCharacterSelectModal(targetGroup) {
        this.characterModalController.open(targetGroup);
    }

    handleCharacterSearch(keyword, renderCallback) {
        renderCallback(this.characterManager.searchCharacters(keyword));
    }

    addCharacterToGroup(character, group) {
        this.groupController.addCharacterToGroup(character, group);
    }

    updateGroupDeleteButtons() {
        this.groupController.updateGroupDeleteButtons();
    }
}

const searchItemTemplate = char => `
    <div class="${LAYOUT_CLASSES.searchItem}" data-character='${JSON.stringify(char)}'>
        ${char.avatar ? `<img src="${char.avatar}" alt="${char.name}">` : ''}
        <div class="search-info">
            <div class="name">${char.name}</div>
            <div class="ip">IP：${char.ip}</div>
            ${char.cv ? `<div class="cv">CV：${char.cv}</div>` : ''}
        </div>
    </div>
`;