export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function smoothScrollTo(targetPosition, duration = 500) {
    const startPosition = window.scrollY;
    const distance = Math.abs(targetPosition - startPosition);
    const adjustedDuration = Math.min(Math.max(distance / 4, 400), 1200);
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / adjustedDuration, 1);
        const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        window.scrollTo(0, startPosition + (targetPosition - startPosition) * ease);
        if (progress < 1) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
}
