function assertPaginationElement(value, label) {
    if (!(value instanceof HTMLElement)) throw new Error(`分页组件缺少有效元素：${label}`);
    return value;
}

function createPageButton(page, currentPage) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pagination__page';
    button.dataset.page = String(page);
    button.textContent = String(page);
    button.setAttribute('aria-label', `第 ${page} 页`);
    button.setAttribute('aria-current', page === currentPage ? 'page' : 'false');
    button.classList.toggle('is-current', page === currentPage);
    return button;
}

function createEllipsis() {
    const item = document.createElement('span');
    item.className = 'pagination__ellipsis';
    item.textContent = '…';
    item.setAttribute('aria-hidden', 'true');
    return item;
}

function getPageSequence(currentPage, totalPages) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages = new Set([1, totalPages, currentPage]);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);
    return [...pages].sort((left, right) => left - right);
}

export function createPagination({ container, pageSize = 25, onPageChange }) {
    const root = assertPaginationElement(container, 'container');
    if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error(`分页组件 pageSize 无效：${pageSize}`);
    if (typeof onPageChange !== 'function') throw new Error('分页组件缺少 onPageChange 回调');

    const previousButton = root.querySelector('[data-page-action="previous"]');
    const nextButton = root.querySelector('[data-page-action="next"]');
    const status = root.querySelector('[data-page-status]');
    const pages = root.querySelector('[data-page-list]');
    if (!previousButton || !nextButton || !status || !pages) throw new Error('分页组件模板结构不完整');

    let currentPage = 1;
    let totalItems = 0;

    function totalPages() {
        return Math.max(1, Math.ceil(totalItems / pageSize));
    }

    function render() {
        const pageCount = totalPages();
        const sequence = getPageSequence(currentPage, pageCount);
        const fragment = document.createDocumentFragment();
        let previousPage = 0;
        sequence.forEach(page => {
            if (page - previousPage > 1) fragment.appendChild(createEllipsis());
            fragment.appendChild(createPageButton(page, currentPage));
            previousPage = page;
        });
        pages.replaceChildren(fragment);
        previousButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === pageCount;
        status.textContent = `第 ${currentPage} / ${pageCount} 页`;
        root.hidden = totalItems === 0;
    }

    function notify() {
        const offset = (currentPage - 1) * pageSize;
        onPageChange({ page: currentPage, pageSize, start: offset, end: offset + pageSize });
    }

    function setPage(page) {
        const nextPage = Math.min(Math.max(1, page), totalPages());
        if (nextPage === currentPage) return;
        currentPage = nextPage;
        render();
        notify();
    }

    root.addEventListener('click', event => {
        const pageButton = event.target.closest('[data-page]');
        if (pageButton) {
            setPage(Number(pageButton.dataset.page));
            return;
        }
        const actionElement = event.target.closest('[data-page-action]');
        const action = actionElement ? actionElement.dataset.pageAction : '';
        if (action === 'previous') setPage(currentPage - 1);
        if (action === 'next') setPage(currentPage + 1);
    });

    return {
        setTotal(total) {
            if (!Number.isInteger(total) || total < 0) throw new Error(`分页总数无效：${total}`);
            totalItems = total;
            currentPage = 1;
            render();
            notify();
        },
        reset() {
            setPage(1);
        }
    };
}
