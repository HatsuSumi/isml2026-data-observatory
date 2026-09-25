const from = new URLSearchParams(window.location.search).get('from');

if (from) {
    const links = document.querySelectorAll('a[data-page]');
    links.forEach(link => link.classList.toggle('active', link.dataset.page === from));
}
