import { smoothScrollTo } from '../common/dom.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.hljs) {
        window.hljs.highlightAll();
    }

    const sections = Array.from(document.querySelectorAll('.standard-section'));
    const navLinks = Array.from(document.querySelectorAll('.standards-nav a'));

    document.querySelector('.standards-nav')?.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const section = document.querySelector(link.getAttribute('href'));
        if (!section) return;

        event.preventDefault();
        const targetPosition = window.scrollY + section.getBoundingClientRect().top - 88;
        smoothScrollTo(targetPosition, 500);
        history.pushState(null, '', link.getAttribute('href'));
    });

    const setActiveLink = (sectionId) => {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
        });
    };

    const observer = new IntersectionObserver((entries) => {
        const current = entries.find(entry => entry.isIntersecting);
        if (current?.target?.id) {
            setActiveLink(current.target.id);
        }
    }, {
        root: null,
        rootMargin: '-25% 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));

    const initialId = location.hash.slice(1) || sections[0]?.id;
    if (initialId) {
        setActiveLink(initialId);
    }
});