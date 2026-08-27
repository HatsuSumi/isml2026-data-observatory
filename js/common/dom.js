export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function smoothScrollTo(targetPosition, duration = 500, container = window, onComplete) {
    const isWindow = container === window;
    const startPosition = isWindow ? window.scrollY : container.scrollTop;
    const adjustedDuration = typeof duration === 'number' && duration > 0 ? duration : 500;
    let startTime = null;
    let frameId = null;
    let cancelled = false;

    function animation(currentTime) {
        if (cancelled) return;
        if (startTime === null) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / adjustedDuration, 1);
        const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const nextPosition = startPosition + (targetPosition - startPosition) * ease;
        if (isWindow) {
            window.scrollTo(0, nextPosition);
        } else {
            container.scrollTop = nextPosition;
        }
        if (progress < 1) {
            frameId = requestAnimationFrame(animation);
        } else {
            onComplete?.();
        }
    }

    frameId = requestAnimationFrame(animation);
    return () => {
        cancelled = true;
        if (frameId !== null) cancelAnimationFrame(frameId);
    };
}
