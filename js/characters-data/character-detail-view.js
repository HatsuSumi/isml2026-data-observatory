export function collectCharacterDetailView() {
    const info = document.querySelector('.character-info');
    return {
        templates: {
            battleRecord: document.getElementById('battle-record-template'),
            eventReport: document.getElementById('event-report-template'),
            navItem: document.getElementById('nav-item-template'),
            backBtn: document.getElementById('back-btn-template'),
            loadingContainer: document.getElementById('loading-container-template'),
            dataRow: document.getElementById('data-row-template'),
            recordLink: document.getElementById('record-link-template'),
            hoverArea: document.getElementById('hover-area-template'),
            characterItem: document.getElementById('character-item-template'),
            noContent: document.getElementById('no-content-template'),
            errorToast: document.getElementById('error-toast-template'),
            characterNavEmpty: document.getElementById('character-nav-empty-template')
        },
        containers: {
            info,
            reports: document.querySelector('.battle-reports'),
            nav: document.querySelector('.nav-list')
        },
        infoElements: {
            avatar: info.querySelector('.character-avatar img'),
            avatarContainer: document.querySelector('.character-avatar'),
            name: info.querySelector('.character-name'),
            ip: info.querySelector('.character-ip'),
            cv: info.querySelector('.character-cv'),
            birthdayRow: info.querySelector('.birthday-row'),
            birthday: info.querySelector('.character-birthday')
        }
    };
}

export function renderCharacterInfo(view, characterData) {
    if (!characterData) return;
    const basic = characterData.basic;
    if (basic.avatar) {
        view.infoElements.avatar.src = basic.avatar;
        view.infoElements.avatar.alt = basic.name;
    } else {
        view.infoElements.avatarContainer.remove();
    }
    view.infoElements.name.textContent = basic.name;
    view.infoElements.ip.textContent = basic.ip;
    view.infoElements.cv.textContent = basic.cv;
    if (basic.birthday) {
        view.infoElements.birthdayRow.hidden = false;
        view.infoElements.birthday.textContent = basic.birthday;
    } else {
        view.infoElements.birthdayRow.remove();
    }
}

export function setPageLoaded() {
    document.querySelector('.character-detail-container')?.classList.add('loaded');
}
