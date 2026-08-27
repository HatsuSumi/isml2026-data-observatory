import { RETURN_FROM_KEY, SCROLL_POSITION_KEY } from './events-data-config.js';

export function savePosition(from) {
    sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString());
    sessionStorage.setItem(RETURN_FROM_KEY, from);
}

export function withFromParam(url, from) {
    if (!url) return '#';
    const [base, hash = ''] = url.split('#');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}from=${encodeURIComponent(from)}${hash ? `#${hash}` : ''}`;
}

export function createEventLink(url, className, text, disabled = false) {
    const element = document.createElement(disabled ? 'span' : 'a');
    element.className = `event-link ${className}${disabled ? ' disabled-link' : ''}`;
    element.textContent = text;
    if (!disabled) {
        element.href = withFromParam(url, 'events-data');
        element.addEventListener('click', () => savePosition(className.includes('visualization') ? 'visualization' : 'table'));
    }
    return element;
}

export function getEventLinks(match, status) {
    const fragment = document.createDocumentFragment();
    if (match.links && status === 'completed') {
        fragment.appendChild(createEventLink(match.links.visualization, 'visualization-link', '数据可视化'));
        fragment.appendChild(createEventLink(match.links.table, 'table-link', '查看表格'));
    } else {
        fragment.appendChild(createEventLink('', 'visualization-link', '数据可视化', true));
        fragment.appendChild(createEventLink('', 'table-link', '查看表格', true));
    }
    return fragment;
}
