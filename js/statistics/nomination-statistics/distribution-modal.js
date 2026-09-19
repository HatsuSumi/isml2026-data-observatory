import { requireElement } from './distribution-data.js';

export function openDistributionModal(modal) {
    if (!modal) throw new Error('分布页弹窗节点缺失');
    modal.style.display = 'block';
    void modal.offsetHeight;
    modal.classList.add('show');
}

export function bindDistributionModal(modal, closeSelector) {
    if (typeof closeSelector !== 'string' || closeSelector === '') {
        throw new Error('分布页弹窗关闭选择器无效');
    }
    requireElement('.status-legend', modal);
    const closeBtn = requireElement(closeSelector, modal);
    const close = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    };
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', event => {
        if (event.target === modal) close();
    });
}

function appendMeta(parent, className, text) {
    const node = document.createElement('div');
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
}

export function fillCharacterList(list, characters, options) {
    if (!list) throw new Error('分布页角色列表节点缺失');
    if (!Array.isArray(characters)) throw new Error('分布页角色列表必须是数组');
    const showIp = Boolean(options && options.showIp);
    const showCv = Boolean(options && options.showCv);

    list.replaceChildren(...characters.map((character, index) => {
        if (!character || typeof character !== 'object') {
            throw new Error('分布页角色数据无效');
        }
        if (typeof character.name !== 'string' || character.name === '') {
            throw new Error('分布页角色缺少名称');
        }
        if (character.status !== '晋级' && character.status !== '未晋级') {
            throw new Error(`分布页角色状态无效：${character.status}`);
        }

        const item = document.createElement('li');
        item.style.transitionDelay = `${0.1 + index * 0.05}s`;
        item.className = character.status === '晋级' ? 'promoted' : 'eliminated';

        if (character.avatar) {
            const image = document.createElement('img');
            image.src = character.avatar;
            image.className = 'character-avatar';
            image.alt = character.name;
            item.appendChild(image);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'character-avatar';
            item.appendChild(placeholder);
        }

        const info = document.createElement('div');
        info.className = 'character-info';
        appendMeta(info, 'character-name', character.name);
        if (showIp && character.ip) appendMeta(info, 'ip-info', character.ip);
        if (showCv && character.cv) appendMeta(info, 'character-cv', `CV: ${character.cv}`);
        if (character.votes === '-') {
            appendMeta(info, 'auto-promote', '自动晋级');
        } else if (character.votes != null && character.votes !== '') {
            appendMeta(info, 'character-votes', `提名得票数: ${character.votes}`);
        }
        item.appendChild(info);
        return item;
    }));
}
