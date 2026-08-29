import { checkTooltips } from './characters-data-card.js';

function wait(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

export function createGenderSwitchController({ getGroup, getChildGroups, isFastSwitching }) {
    let switchVersion = 0;

    async function switchGender(targetGender) {
        const version = ++switchVersion;
        const showGroup = getGroup(targetGender);
        const hideGroup = getGroup(targetGender === 'female' ? 'male' : 'female');
        const fast = isFastSwitching();

        if (fast) {
            hideGroup.style.display = 'none';
            hideGroup.classList.remove('show');
            getChildGroups(hideGroup).forEach(child => child.classList.remove('show'));
            showGroup.style.display = '';
            showGroup.classList.add('show');
            getChildGroups(showGroup).forEach(child => child.classList.add('show'));
            showGroup.querySelectorAll('.character-card').forEach(card => card.classList.add('show'));
            requestAnimationFrame(checkTooltips);
            return;
        }

        const childGroups = getChildGroups(showGroup);
        const cards = showGroup.querySelectorAll('.character-card');
        childGroups.forEach(child => child.classList.remove('show'));
        cards.forEach(card => card.classList.remove('show'));
        hideGroup.classList.remove('show');
        getChildGroups(hideGroup).forEach(child => child.classList.remove('show'));

        await wait(300);
        if (version !== switchVersion) return;
        hideGroup.style.display = 'none';
        showGroup.style.display = '';
        await nextFrame();
        if (version !== switchVersion) return;
        showGroup.classList.add('show');
        requestAnimationFrame(checkTooltips);
        childGroups.forEach((child, childIndex) => {
            setTimeout(() => {
                if (version !== switchVersion) return;
                child.classList.add('show');
                child.querySelectorAll('.character-card').forEach((card, cardIndex) => {
                    setTimeout(() => {
                        if (version === switchVersion) card.classList.add('show');
                    }, cardIndex * 20);
                });
            }, childIndex * 100);
        });
        if (!childGroups.length) {
            cards.forEach((card, index) => {
                setTimeout(() => {
                    if (version === switchVersion) card.classList.add('show');
                }, index * 20);
            });
        }
    }

    return { switchGender };
}
