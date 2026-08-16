import { CharacterManager } from './character/service/CharacterManager.js';
import { CharacterPageController } from './character/presentation/CharacterPageController.js';

document.addEventListener('DOMContentLoaded', () => {
    window.onkeydown = event => {
        if (!event.altKey || event.key.toLowerCase() !== 'n') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const addButton = document.getElementById('addCharacterBtn');
        if (addButton && addButton.offsetParent !== null && !addButton.disabled) {
            pageController.addCharacter();
        }
    };

    const characterManager = new CharacterManager();
    const pageController = new CharacterPageController(characterManager);
    const comparison = document.querySelector('.character-comparison');
    if (comparison) {
        comparison.__uiManager = pageController;
    }
    pageController.updateDeleteButtons();
});