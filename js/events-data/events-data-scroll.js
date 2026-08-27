import { smoothScrollTo } from '../common/dom.js';
import { RETURN_FROM_KEY, SCROLL_POSITION_KEY } from './events-data-config.js';

export function getDocumentTop(element) {
    return element.getBoundingClientRect().top + window.scrollY;
}

export function setupScrollTracking(updateActiveState) {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            let currentPhase = null;
            let minDistance = Infinity;
            document.querySelectorAll('[data-phase]').forEach(phase => {
                const distance = Math.abs(phase.getBoundingClientRect().top - 100);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentPhase = phase.dataset.phase;
                }
            });
            if (currentPhase) updateActiveState(currentPhase);
        }, 100);
    });
}

export function restoreSavedPosition() {
    const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
    const returnFrom = sessionStorage.getItem(RETURN_FROM_KEY);
    if (!returnFrom || !savedPosition) return;
    setTimeout(() => {
        smoothScrollTo(parseInt(savedPosition, 10));
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
        sessionStorage.removeItem(RETURN_FROM_KEY);
    }, 100);
}

export function scrollToHash(hash, updateActiveState) {
    if (!hash) return;
    const targetElement = document.querySelector(`[data-phase="${hash}"]`);
    if (!targetElement) return;
    setTimeout(() => {
        smoothScrollTo(getDocumentTop(targetElement) - 80);
        updateActiveState(targetElement.dataset.phase);
    }, 100);
}

export { smoothScrollTo };
