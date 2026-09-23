import { reconcileKeyedList } from '../common/keyed-list.js';

const DATA_URL = new URL('../../data/gallery.json', import.meta.url);
const TYPES = Object.freeze({ match: '对阵图', honor: '荣誉海报', milestone: '里程碑海报', placeholder: '' });
const SVG_NS = 'http://www.w3.org/2000/svg';
let dataPromise;

function required(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`图库初始化失败：缺少 ${selector}`);
    return element;
}

function validate(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.items) || !Array.isArray(data.connections) || data.version < 2) throw new Error('图库数据格式错误');
    const ids = new Set();
    data.items.forEach((item, index) => {
        if (!item || typeof item.id !== 'string' || ids.has(item.id) || !Object.hasOwn(TYPES, item.type) || (item.type !== 'placeholder' && (typeof item.title !== 'string' || typeof item.src !== 'string'))) throw new Error(`图库数据格式错误：items[${index}]`);
        if (item.type !== 'placeholder') {
            const url = new URL(item.src);
            if (url.protocol !== 'https:') throw new Error(`图库数据格式错误：items[${index}] URL 无效`);
        }
        if (!Number.isFinite(item.order) || !item.position || item.position.x < 5 || item.position.x > 95 || item.position.y < 5 || item.position.y > 95) throw new Error(`图库数据格式错误：items[${index}] 坐标无效`);
        ids.add(item.id);
    });
    data.connections.forEach(edge => { if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error('图库数据格式错误：连线端点不存在'); });
    return { items: [...data.items].sort((a, b) => a.order - b.order), connections: data.connections };
}

function loadData() {
    dataPromise ??= fetch(DATA_URL).then(response => { if (!response.ok) throw new Error(`图库数据请求失败：${response.status}`); return response.json(); }).then(validate);
    return dataPromise;
}

function view() {
    const viewer = required('#galleryViewer');
    return { exhibition: required('.gallery-exhibition'), filters: required('.gallery-filters'), count: required('#galleryCount'), shell: required('#galleryMapShell'), viewport: required('#galleryViewport'), map: required('#galleryMap'), svg: required('#galleryConnections'), nodes: required('#galleryNodes'), template: required('#gallery-item-template'), error: required('#gallery-error-template'), scaleDisplay: required('#galleryMapScale'), background: required('#galleryBackground'), viewer, position: required('#galleryViewerPosition', viewer), image: required('.gallery-viewer-image', viewer), type: required('.gallery-viewer-type', viewer), title: required('#galleryViewerTitle', viewer), message: required('.gallery-viewer-message', viewer), previous: required('[data-action="previous"]', viewer), next: required('[data-action="next"]', viewer) };
}

function applyThumbnailSize(image) {
    const frame = image.closest('.gallery-star-image-frame');
    const node = image.closest('.gallery-node');
    if (!frame || !node) throw new Error('图库图片状态错误：图片缺少星体容器');
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
    const maxWidth = 160;
    const maxHeight = 180;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    node.style.setProperty('--gallery-thumb-width', `${Math.max(1, Math.round(image.naturalWidth * scale))}px`);
    node.style.setProperty('--gallery-thumb-height', `${Math.max(1, Math.round(image.naturalHeight * scale))}px`);
}

function nodeFrom(template) {
    const node = template.content.cloneNode(true).querySelector('.gallery-node');
    if (!node) throw new Error('图库模板错误：缺少 .gallery-node');
    return node;
}

function updateNode(node, item, index) {
    node.dataset.galleryId = item.id;
    node.dataset.galleryType = item.type;
    node.classList.toggle('is-placeholder', item.type === 'placeholder');
    node.style.left = `${item.position.x}%`;
    node.style.top = `${item.position.y}%`;
    const button = required('.gallery-star', node);
    button.dataset.index = index ?? '';
    button.disabled = item.type === 'placeholder';
    button.setAttribute('aria-label', item.type === 'placeholder' ? '星图占位星体' : `${item.title}，打开大图`);
    required('.gallery-type', node).textContent = TYPES[item.type];
    required('.gallery-title', node).textContent = item.title;
    const image = required('.gallery-star-image', node);
    const frame = required('.gallery-star-image-frame', node);
    frame.classList.remove('has-error');
    frame.style.removeProperty('--gallery-thumb-width');
    frame.style.removeProperty('--gallery-thumb-height');
    image.classList.remove('is-loaded');
    if (item.type === 'placeholder') {
        image.removeAttribute('src');
        image.alt = '';
    } else {
        image.src = item.src;
        image.alt = item.title;
    }
}

function drawLines(target, items, edges, visible) {
    const positions = new Map(items.map(item => [item.id, item.position]));
    target.replaceChildren();
    edges.forEach(edge => {
        if (!visible.has(edge.from) || !visible.has(edge.to)) return;
        const line = document.createElementNS(SVG_NS, 'line');
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        line.classList.add('gallery-connection');
        line.setAttribute('x1', from.x); line.setAttribute('y1', from.y); line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
        line.dataset.from = edge.from; line.dataset.to = edge.to;
        target.appendChild(line);
    });
}

class Gallery {
    constructor(elements, data) {
        Object.assign(this, elements, data);
        this.filtered = this.items.filter(item => item.type !== 'placeholder');
        this.mapItems = this.items;
        this.filter = 'all';
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.drag = null;
        this.viewerIndex = -1;
        this.trigger = null;
        this.adjacency = this.buildGraph();
    }

    buildGraph() {
        const graph = new Map();
        this.items.forEach(item => graph.set(item.id, []));
        this.connections.forEach(edge => {
            if (!graph.has(edge.from)) graph.set(edge.from, []);
            if (!graph.has(edge.to)) graph.set(edge.to, []);
            graph.get(edge.from).push({ to: edge.to, edge });
            graph.get(edge.to).push({ to: edge.from, edge });
        });
        return graph;
    }

    init() {
        this.bind();
        this.render();
        this.centerMap();
        this.startBackground();
        this.viewReady();
    }

    viewReady() {
        this.exhibition.setAttribute('aria-busy', 'false');
    }

    centerMap() {
        const bounds = this.getContentBounds();
        const contentWidth = (bounds.maxX - bounds.minX);
        const contentHeight = (bounds.maxY - bounds.minY);
        const contentCenterX = bounds.minX + contentWidth / 2;
        const contentCenterY = bounds.minY + contentHeight / 2;
        const mapWidth = this.map.offsetWidth;
        const mapHeight = this.map.offsetHeight;
        const viewportCenterX = this.viewport.clientWidth / 2;
        const viewportCenterY = this.viewport.clientHeight / 2;
        this.offset.x = viewportCenterX - (contentCenterX / 100 * mapWidth) * this.scale;
        this.offset.y = viewportCenterY - (contentCenterY / 100 * mapHeight) * this.scale;
        this.applyTransform();
    }

    getContentBounds() {
        const visibleItems = this.filter === 'all' ? this.items : this.filtered;
        if (visibleItems.length === 0) return { minX: 50, maxX: 50, minY: 50, maxY: 50 };
        let minX = 100, maxX = 0, minY = 100, maxY = 0;
        visibleItems.forEach(item => {
            minX = Math.min(minX, item.position.x);
            maxX = Math.max(maxX, item.position.x);
            minY = Math.min(minY, item.position.y);
            maxY = Math.max(maxY, item.position.y);
        });
        return { minX, maxX, minY, maxY };
    }

    bind() {
        this.filters.addEventListener('click', event => { const button = event.target.closest('.gallery-filter'); if (button) this.setFilter(button.dataset.filter); });
        this.nodes.addEventListener('click', event => { const button = event.target.closest('[data-action="preview"]'); if (!button) return; const id = button.closest('.gallery-node').dataset.galleryId; if (this.items.find(item => item.id === id)?.type !== 'placeholder') this.open(id, button); });
        this.nodes.addEventListener('mouseenter', event => { const node = event.target.closest('.gallery-node'); if (node) this.highlightConnections(node.dataset.galleryId); }, true);
        this.nodes.addEventListener('mouseleave', event => { const node = event.target.closest('.gallery-node'); if (node) this.clearHighlight(); }, true);
        this.nodes.addEventListener('load', event => {
            if (!event.target.matches('.gallery-star-image')) return;
            applyThumbnailSize(event.target);
            event.target.classList.add('is-loaded');
        }, true);
        this.nodes.addEventListener('error', event => { if (event.target.matches('.gallery-star-image')) event.target.closest('.gallery-star-image-frame').classList.add('has-error'); }, true);
        this.viewport.addEventListener('pointerdown', event => this.startDrag(event));
        this.viewport.addEventListener('pointermove', event => this.moveDrag(event));
        this.viewport.addEventListener('pointerup', () => this.stopDrag());
        this.viewport.addEventListener('pointercancel', () => this.stopDrag());
        this.viewport.addEventListener('wheel', event => { event.preventDefault(); const bounds = this.viewport.getBoundingClientRect(); this.zoom(this.scale + (event.deltaY < 0 ? .1 : -.1), event.clientX - bounds.left, event.clientY - bounds.top); }, { passive: false });
        this.shell.addEventListener('click', event => { const control = event.target.closest('[data-map-action]'); if (control) this.mapAction(control.dataset.mapAction); });
        window.addEventListener('resize', () => { this.centerMap(); this.resizeBackground(); });
        this.viewer.addEventListener('click', event => { const control = event.target.closest('[data-action]'); if (control) this.viewerAction(control.dataset.action); else if (event.target === this.viewer) this.closeViewer(); });
        document.addEventListener('keydown', event => { if (event.key === 'Escape' && this.viewer.classList.contains('is-open')) this.closeViewer(); });
        this.viewer.addEventListener('keydown', event => {
            if (event.key === 'Tab' && this.viewer.classList.contains('is-open')) {
                const focusable = [...this.viewer.querySelectorAll('button:not(:disabled)')];
                const first = focusable[0];
                const last = focusable.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                return;
            }
            const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
            if (offset && this.viewer.classList.contains('is-open')) { event.preventDefault(); this.moveViewer(offset); }
        });
        this.viewer.addEventListener('load', event => { if (event.target.matches('.gallery-viewer-image')) this.viewer.classList.remove('has-image-error'); }, true);
        this.viewer.addEventListener('error', event => { if (event.target.matches('.gallery-viewer-image')) { this.viewer.classList.add('has-image-error'); this.message.textContent = '预览图片加载失败，请检查图床链接'; } }, true);
    }

    render() {
        const displayItems = this.filter === 'all' ? this.items : this.filtered;
        const visible = new Set(displayItems.map(item => item.id));
        const index = new Map(displayItems.filter(item => item.type !== 'placeholder').map((item, number) => [item.id, number]));
        reconcileKeyedList(this.nodes, displayItems, { keyAttribute: 'galleryId', getKey: item => item.id, create: () => nodeFrom(this.template), update: (node, item) => updateNode(node, item, index.get(item.id)) });
        drawLines(this.svg, this.items, this.connections, visible);
        this.count.textContent = this.filtered.length;
    }

    setFilter(filter) {
        if (filter !== 'all' && !['match', 'honor', 'milestone'].includes(filter)) throw new Error(`图库筛选错误：${filter}`);
        this.filter = filter;
        this.filtered = filter === 'all' ? this.items.filter(item => item.type !== 'placeholder') : this.items.filter(item => item.type === filter);
        this.filters.querySelectorAll('.gallery-filter').forEach(button => { const active = button.dataset.filter === filter; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', active); });
        this.render();
        this.centerMap();
    }

    startDrag(event) { if (event.target.closest('button')) return; this.drag = { x: event.clientX, y: event.clientY, offset: { ...this.offset } }; this.viewport.setPointerCapture(event.pointerId); this.viewport.classList.add('is-dragging'); }
    moveDrag(event) { if (!this.drag) return; this.offset.x = this.drag.offset.x + event.clientX - this.drag.x; this.offset.y = this.drag.offset.y + event.clientY - this.drag.y; this.applyTransform(); }
    stopDrag() { this.drag = null; this.viewport.classList.remove('is-dragging'); }
    mapAction(action) { const actions = { 'zoom-in': () => this.zoom(this.scale + .1), 'zoom-out': () => this.zoom(this.scale - .1), reset: () => { this.scale = 1; this.centerMap(); } }; if (!actions[action]) throw new Error(`星图操作错误：${action}`); actions[action](); }
    zoom(value, x = this.viewport.clientWidth / 2, y = this.viewport.clientHeight / 2) { const next = Math.min(1.8, Math.max(.7, Number(value.toFixed(2)))); const ratio = next / this.scale; this.offset.x = x - (x - this.offset.x) * ratio; this.offset.y = y - (y - this.offset.y) * ratio; this.scale = next; this.applyTransform(); }
    applyTransform() { this.map.style.transform = `translate(${this.offset.x}px,${this.offset.y}px) scale(${this.scale})`; this.scaleLabel(); }
    scaleLabel() { this.scaleDisplay.textContent = `${Math.round(this.scale * 100)}%`; }

    highlightConnections(id) {
        this.svg.querySelectorAll('.gallery-connection').forEach(line => {
            const isRelated = line.dataset.from === id || line.dataset.to === id;
            line.classList.toggle('is-active', isRelated);
        });
    }

    clearHighlight() {
        this.svg.querySelectorAll('.gallery-connection.is-active').forEach(line => line.classList.remove('is-active'));
    }

    startBackground() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this.backgroundContext = this.background.getContext('2d');
        if (!this.backgroundContext) return;
        this.backgroundStars = [];
        this.dustParticles = [];
        this.resizeBackground();
        for (let index = 0; index < 150; index += 1) this.backgroundStars.push(this.createBackgroundStar());
        for (let index = 0; index < 40; index += 1) this.dustParticles.push(this.createDustParticle());
        this.animateBackground();
    }

    resizeBackground() {
        if (!this.backgroundContext) return;
        const bounds = this.shell.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.background.width = Math.round(bounds.width * ratio);
        this.background.height = Math.round(bounds.height * ratio);
        this.backgroundContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.backgroundSize = { width: bounds.width, height: bounds.height };
    }

    createBackgroundStar() {
        const { width, height } = this.backgroundSize;
        return { x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.35 + .25, alpha: Math.random() * .55 + .2, phase: Math.random() * Math.PI * 2, speed: Math.random() * .018 + .004 };
    }

    createDustParticle() {
        const { width, height } = this.backgroundSize;
        return { x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.1 + .25, alpha: Math.random() * .09 + .02, speed: Math.random() * .12 + .025 };
    }

    animateBackground() {
        if (!this.backgroundContext || !this.shell.isConnected) return;
        const context = this.backgroundContext;
        const { width, height } = this.backgroundSize;
        context.clearRect(0, 0, width, height);
        const nebula = context.createRadialGradient(width * .24, height * .32, 0, width * .24, height * .32, width * .42);
        nebula.addColorStop(0, 'rgba(52, 102, 190, .16)');
        nebula.addColorStop(.55, 'rgba(43, 72, 150, .06)');
        nebula.addColorStop(1, 'rgba(5, 9, 20, 0)');
        context.fillStyle = nebula;
        context.fillRect(0, 0, width, height);
        const secondNebula = context.createRadialGradient(width * .78, height * .68, 0, width * .78, height * .68, width * .35);
        secondNebula.addColorStop(0, 'rgba(38, 149, 183, .1)');
        secondNebula.addColorStop(1, 'rgba(5, 9, 20, 0)');
        context.fillStyle = secondNebula;
        context.fillRect(0, 0, width, height);
        const drawParticle = (particle, star = false) => {
            if (star) particle.phase += particle.speed;
            else {
                particle.x += particle.speed;
                if (particle.x > width + 2) { particle.x = -2; particle.y = Math.random() * height; }
            }
            const alpha = star ? particle.alpha * (.72 + Math.sin(particle.phase) * .28) : particle.alpha;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(220, 239, 255, ${alpha})`;
            context.shadowColor = 'rgba(126, 194, 255, .8)';
            context.shadowBlur = star && particle.radius > 1.1 ? 8 : 2;
            context.fill();
        };
        context.shadowBlur = 0;
        this.dustParticles.forEach(particle => drawParticle(particle));
        this.backgroundStars.forEach(star => drawParticle(star, true));
        context.shadowBlur = 0;
        this.backgroundFrame = requestAnimationFrame(() => this.animateBackground());
    }

    open(id, trigger) { this.viewerIndex = this.filtered.findIndex(item => item.id === id); if (this.viewerIndex < 0) throw new Error(`图库预览错误：${id}`); this.trigger = trigger; this.renderViewer(); this.viewer.setAttribute('aria-hidden', 'false'); this.viewer.classList.add('is-open'); document.body.classList.add('gallery-viewer-open'); this.viewer.focus({ preventScroll: true }); }
    closeViewer() { if (!this.viewer.classList.contains('is-open')) return; this.viewer.classList.remove('is-open'); this.viewer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('gallery-viewer-open'); this.viewerIndex = -1; this.message.textContent = ''; if (this.trigger?.isConnected) this.trigger.focus({ preventScroll: true }); this.trigger = null; }
    renderViewer() { const item = this.filtered[this.viewerIndex]; if (!item) throw new Error('图库预览错误：索引无效'); this.viewer.classList.remove('has-image-error'); this.position.textContent = `${this.viewerIndex + 1} / ${this.filtered.length}`; this.image.src = item.src; this.image.alt = item.title; this.type.textContent = TYPES[item.type]; this.title.textContent = item.title; this.previous.disabled = this.viewerIndex === 0; this.next.disabled = this.viewerIndex === this.filtered.length - 1; this.message.textContent = ''; }
    viewerAction(action) { const actions = { close: () => this.closeViewer(), previous: () => this.moveViewer(-1), next: () => this.moveViewer(1), download: () => void this.download() }; if (!actions[action]) throw new Error(`预览操作错误：${action}`); actions[action](); }
    moveViewer(offset) { const next = this.viewerIndex + offset; if (next >= 0 && next < this.filtered.length) { this.viewerIndex = next; this.renderViewer(); } }
    async download() { const item = this.filtered[this.viewerIndex]; if (!item) throw new Error('图库下载错误：当前没有图片'); this.message.textContent = '正在准备下载...'; try { const response = await fetch(item.src); if (!response.ok) throw new Error(String(response.status)); const blob = await response.blob(); const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[blob.type] || 'png'; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${item.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')}.${ext}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); this.message.textContent = '下载已开始'; } catch { this.message.textContent = '下载失败：图床未允许跨域下载或网络连接异常'; } }
}

function showError(elements, error) { const node = elements.error.content.cloneNode(true); required('p', node).textContent = `图库加载失败：${error.message}`; elements.shell.replaceChildren(node); elements.exhibition.setAttribute('aria-busy', 'false'); }
async function initialize() { const elements = view(); try { new Gallery(elements, await loadData()).init(); } catch (error) { console.error('图库初始化失败:', error); showError(elements, error); } }
document.addEventListener('DOMContentLoaded', () => void initialize());
