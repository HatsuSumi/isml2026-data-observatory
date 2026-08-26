export { debounce, smoothScrollTo } from '../../common/dom.js';

export function getOffsetTop(element) {
    let offsetTop = 0;
    while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
    }
    return offsetTop;
}

export function isInViewport(element, offset = 0) {
    const rect = element.getBoundingClientRect();
    return rect.top <= offset && rect.bottom > offset;
}
