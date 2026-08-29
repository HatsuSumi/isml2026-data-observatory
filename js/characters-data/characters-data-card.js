import { Router } from '../common/router.js';

export function createCardContext(templates) {
    return {
        templates,
        ipMap: new Map()
    };
}

export function createCharacterCard(char, gender, context) {
    const { templates, ipMap } = context;
    const card = templates.characterCard.content.cloneNode(true).querySelector('.character-card');
    card.dataset.gender = gender;
    card.dataset.id = char.id;
    card.dataset.ip = char.ip;

    let sameIpCards = ipMap.get(char.ip);
    if (!sameIpCards) {
        sameIpCards = new Set();
        ipMap.set(char.ip, sameIpCards);
    }
    sameIpCards.add(card);

    if (char.avatar) {
        const image = card.querySelector('img');
        image.src = char.avatar;
        image.alt = char.name;
    }

    card.querySelector('.character-name').textContent = char.name;
    const ip = card.querySelector('.character-ip');
    const ipText = templates.ipText.content.cloneNode(true).querySelector('.ip-text');
    ipText.textContent = char.ip;
    ip.appendChild(ipText);

    const tooltipTemplate = templates.customTooltip;
    if (tooltipTemplate) {
        const tooltip = tooltipTemplate.content.cloneNode(true).querySelector('.custom-tooltip');
        tooltip.textContent = char.ip;
        ip.appendChild(tooltip);
    }
    card.querySelector('.character-cv').textContent = char.cv;

    card.addEventListener('click', () => Router.navigateToCharacter(char.id));
    card.addEventListener('mouseenter', () => sameIpCards.forEach(item => item.classList.add('same-ip')));
    card.addEventListener('mouseleave', () => sameIpCards.forEach(item => item.classList.remove('same-ip')));
    return card;
}

export function clearIpCache(context) {
    context.ipMap.clear();
}

export function checkTooltips() {
    document.querySelectorAll('.character-ip').forEach(ip => {
        if (!ip.offsetParent) return;
        const ipText = ip.querySelector('.ip-text');
        const tooltip = ip.querySelector('.custom-tooltip');
        if (ipText && tooltip && ipText.scrollWidth <= ipText.clientWidth) tooltip.remove();
    });
}
