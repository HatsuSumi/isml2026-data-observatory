import { cloneScheduleTemplate } from '../utils/template.js';
import { getScheduleData } from '../state/scheduleState.js';
import { getMatchDetails, getMatchStatus } from '../utils/match.js';

export function getResultClass(result) {
    switch (result) {
        case '晋级': return 'win';
        case '胜利': return 'win';
        case '淘汰': return 'lose';
        case '失败': return 'lose';
        case '未晋级': return 'lose';
        case '参赛': return 'pending';
        default: return 'pending';
    }
}

export function renderDefaultMatchStatus(match, status) {
    const statusText = {
        completed: '已结束',
        ongoing: '进行中',
        upcoming: '即将开始',
        pending: '未开始',
        postponed: '已延期'
    };

    const statusIcon = {
        completed: '✓',
        ongoing: '●',
        upcoming: '○',
        pending: '·',
        postponed: '!'
    };

    const statusEl = match.querySelector('.match-status');
    if (!statusEl) return;

    statusEl.className = `match-status ${status}`;
    statusEl.innerHTML = `
        <span class="status-icon">${statusIcon[status]}</span>
        ${statusText[status]}
    `;
    match.className = `timeline-item ${status}`;
}

export function renderCharacterMatchStatus(match, result) {
    const statusEl = match.querySelector('.match-status');
    if (!statusEl) return;

    const resultClass = getResultClass(result);
    statusEl.textContent = result;
    statusEl.className = `match-status ${resultClass}`;
}

export function clearCharacterSelection() {
    document.querySelector('.character-selection')?.remove();
}

export function showCharacterSelection(characters, onSelectCharacter) {
    clearCharacterSelection();
    const selectionEl = cloneScheduleTemplate('schedule-character-selection-template', '.character-selection');

    characters.forEach(([, char]) => {
        const button = cloneScheduleTemplate('schedule-character-selection-item-template', '.character-selection-item');
        const avatar = button.querySelector('.avatar');
        const img = button.querySelector('img');
        const info = button.querySelector('.info');

        if (char.avatar) {
            avatar.hidden = false;
            img.src = char.avatar;
            img.alt = `${char.name}头像`;
        }

        info.textContent = `${char.name}（${char.ip}）`;

        button.addEventListener('click', () => {
            onSelectCharacter(char);
            selectionEl.remove();
            document.getElementById('timeline').hidden = false;
        });
        selectionEl.appendChild(button);
    });

    const searchEl = document.getElementById('characterSearch');
    searchEl.parentNode.insertBefore(selectionEl, searchEl.nextSibling);
}

export function filterTimelineByCharacter(character) {
    const timeline = document.getElementById('timeline');
    const sections = timeline.querySelectorAll('.timeline-section');
    const elevatorNav = document.querySelector('.elevator-nav');
    document.getElementById('characterSearch').value = `${character.name}（${character.ip}）`;

    const participatedMatches = new Set(character.matches.map(match => match.title));

    sections.forEach(section => {
        const matches = section.querySelectorAll('.timeline-item');
        let hasVisibleMatch = false;

        matches.forEach(match => {
            const matchTitle = match.querySelector('.match-title').textContent;
            if (participatedMatches.has(matchTitle)) {
                match.hidden = false;
                hasVisibleMatch = true;

                const characterMatch = character.matches.find(item => item.title === matchTitle);
                if (characterMatch) {
                    renderCharacterMatchStatus(match, characterMatch.result);
                }
            } else {
                match.hidden = true;
            }
        });

        section.hidden = !hasVisibleMatch;
        const navItem = elevatorNav.querySelector(`[href="#${section.id}"]`);
        if (navItem) {
            navItem.parentElement.hidden = !hasVisibleMatch;
        }
    });
}

export function showAllMatches() {
    const timeline = document.getElementById('timeline');
    const sections = timeline.querySelectorAll('.timeline-section');
    const elevatorNav = document.querySelector('.elevator-nav');

    sections.forEach(section => {
        section.hidden = false;
        const navItem = elevatorNav.querySelector(`[href="#${section.id}"]`);
        if (navItem) {
            navItem.parentElement.hidden = false;
        }
    });

    const allMatches = Array.from(timeline.querySelectorAll('.timeline-item')).filter((match, index, self) =>
        index === self.findIndex(item =>
            item.querySelector('.match-title').textContent === match.querySelector('.match-title').textContent
        )
    );

    allMatches.forEach(match => {
        match.hidden = false;
        const matchTitle = match.querySelector('.match-title').textContent;
        const matchData = getMatchDetails(getScheduleData(), matchTitle);

        if (matchData) {
            const status = getMatchStatus(matchData);
            renderDefaultMatchStatus(match, status);
        }
    });
}
