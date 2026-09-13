import { RETURN_FROM_KEY, SCROLL_POSITION_KEY } from './events-data-config.js';

export function savePosition(from) {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    sessionStorage.setItem(RETURN_FROM_KEY, from);
}

export function withFromParam(url, from) {
    if (!url) return '#';
    const target = new URL(url, document.baseURI);
    target.searchParams.set('from', from);
    return target.pathname + target.search + target.hash;
}

export function createEventLink(url, className, text, disabled = false) {
    const element = document.createElement(disabled ? 'span' : 'a');
    element.className = `event-link ${className}${disabled ? ' disabled-link' : ''}`;
    element.textContent = text;
    if (!disabled) {
        element.href = withFromParam(url, 'events-data');
        element.addEventListener('click', () => savePosition(
            className.includes('visualization') ? 'visualization' :
                className.includes('table') ? 'table' : 'context'
        ));
    }
    return element;
}

export function getEventLinks(match, status) {
    const fragment = document.createDocumentFragment();
    const resultLinks = [
        ['visualization', 'visualization-link', '数据可视化'],
        ['table', 'table-link', '查看表格']
    ];
    const contextLinks = [
        ['groups', 'groups-link', '角色分组'],
        ['rules', 'rules-link', '赛事规则']
    ];

    resultLinks.forEach(([key, className, text]) => {
        const url = match.links?.[key];
        fragment.appendChild(createEventLink(
            status === 'completed' ? url : '', className, text, status !== 'completed' || !url
        ));
    });
    contextLinks.forEach(([key, className, text]) => {
        const url = match.links?.[key];
        if (url) fragment.appendChild(createEventLink(url, className, text));
    });
    return fragment;
}
