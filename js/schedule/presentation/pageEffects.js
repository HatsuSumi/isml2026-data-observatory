import { cloneScheduleTemplate } from '../utils/template.js';
import { SCROLL_POSITION_KEY } from '../state/scheduleState.js';

export function updateCountdown() {
    const countdowns = document.querySelectorAll('[data-countdown]');

    countdowns.forEach(element => {
        const dateStr = element.dataset.countdown;
        const [date, time] = dateStr.split(' ');
        const targetDate = new Date(`${date}T${time}`);
        const now = new Date();
        const diff = targetDate - now;

        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            element.textContent = `${days}天${hours}小时${minutes}分${seconds}秒`;
        } else {
            const countdownContainer = element.closest('p');
            if (countdownContainer) {
                countdownContainer.hidden = true;
            }
        }
    });
}

export function initReminders() {
    const reminderLinks = document.querySelectorAll('.match-link');

    reminderLinks.forEach(link => {
        if (link.textContent === '设置提醒') {
            link.addEventListener('click', event => {
                event.preventDefault();
                const tooltip = cloneScheduleTemplate('schedule-tooltip-template', '.tooltip');
                tooltip.textContent = '目前静态网站暂不支持，未来升级成动态网站后将支持提醒功能';
                tooltip.classList.add('is-global-toast');
                document.body.appendChild(tooltip);
                setTimeout(() => tooltip.remove(), 3000);
            });
        }
    });
}

export function saveScrollPosition() {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
}

export function initSavePosition() {
    const links = document.querySelectorAll('a:not([target="_blank"])');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#') && href !== '#') {
            link.addEventListener('mousedown', saveScrollPosition);
        }
    });
}

export function initStickySearchContainer() {
    window.addEventListener('scroll', () => {
        const searchContainer = document.querySelector('.search-container');
        const scrollY = window.scrollY;
        searchContainer.classList.toggle('is-compact-search', scrollY > 100);
    });
}
