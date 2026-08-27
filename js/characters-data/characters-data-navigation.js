import { smoothScrollTo } from '../common/dom.js';

export function scrollToElement(targetElement, duration = 500) {
    const targetY = window.scrollY + targetElement.getBoundingClientRect().top - 80;
    smoothScrollTo(targetY, duration);
}

function getTargetElement(item) {
    const season = item.dataset.season;
    return season
        ? document.querySelector(`.season-group[data-season="${season}"]`)
        : document.querySelector(`.group-container.${item.dataset.target}`);
}

export function updateActiveNavItem(nav) {
    const navItems = nav.querySelectorAll('.elevator-nav-item');
    const scrollPosition = window.scrollY + window.innerHeight / 3;
    let activeItem = null;
    navItems.forEach(item => {
        const targetElement = getTargetElement(item);
        if (!targetElement) return;
        const absoluteTop = window.scrollY + targetElement.getBoundingClientRect().top;
        if (scrollPosition >= absoluteTop) activeItem = item;
    });
    navItems.forEach(item => item.classList.remove('active'));
    activeItem?.classList.add('active');
}

export function initElevatorNav() {
    const nav = document.querySelector('.elevator-nav');
    const navItems = nav.querySelectorAll('.elevator-nav-item');
    const novaGroup = nav.querySelector('.elevator-nav-item[data-target="nova"]');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.target === 'nova') return;
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');
            const targetElement = getTargetElement(item);
            if (targetElement) scrollToElement(targetElement);
        });
    });

    novaGroup?.addEventListener('click', event => {
        event.stopPropagation();
        if (!event.target.closest('.sub-item')) novaGroup.classList.toggle('collapsed');
    });

    setupScrollTracking(nav);
}

export function setupScrollTracking(nav = document.querySelector('.elevator-nav')) {
    if (!nav) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        window.requestAnimationFrame(() => {
            updateActiveNavItem(nav);
            ticking = false;
        });
        ticking = true;
    });
}
