export function reconcileKeyedList(container, items, { getKey, create, update, keyAttribute = 'key' }) {
    const existing = new Map();

    Array.from(container.children).forEach(node => {
        const key = node.dataset[keyAttribute];
        if (key !== undefined) {
            existing.set(key, node);
        }
    });

    const fragment = document.createDocumentFragment();
    const retainedKeys = new Set();

    items.forEach(item => {
        const key = String(getKey(item));
        let node = existing.get(key);

        if (!node) {
            node = create(item);
        }

        node.dataset[keyAttribute] = key;
        update(node, item);
        retainedKeys.add(key);
        fragment.appendChild(node);
    });

    existing.forEach((node, key) => {
        if (!retainedKeys.has(key)) {
            node.remove();
        }
    });

    container.appendChild(fragment);
}
