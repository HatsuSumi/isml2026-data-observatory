export function smoothScrollTo(targetPosition, duration = 500) {
    const startPosition = window.scrollY;
    const distance = Math.abs(targetPosition - startPosition);

    const adjustedDuration = Math.min(
        Math.max(distance / 4, 400),
        1200
    );

    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / adjustedDuration, 1);

        const ease = value => {
            return value < 0.5
                ? 2 * value * value
                : 1 - Math.pow(-2 * value + 2, 2) / 2;
        };

        window.scrollTo(0, startPosition + (targetPosition - startPosition) * ease(progress));

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

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

export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
