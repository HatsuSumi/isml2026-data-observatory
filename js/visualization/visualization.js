document.addEventListener('DOMContentLoaded', () => {
    initVisualization().catch((error) => {
        console.error('可视化初始化失败:', error);
        renderError(error instanceof Error ? error.message : '可视化加载失败');
    });
});

const DEFAULT_SIZE = { width: 1800, height: 2200 };
const RENDER_CONFIG = {
    grid: { left: '15%', right: '15%', top: '2%', bottom: '5%', containLabel: true },
    theme: 'dark',
    renderer: 'canvas'
};

async function initVisualization() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const mode = normalizeMode(params.get('mode'));

    if (!id) throw new Error('缺少可视化 id 参数');

    const matchConfig = await getVisualizationConfig(id);
    if (!matchConfig) throw new Error(`未找到可视化配置：${id}`);

    updateTableLink(matchConfig);
    const rawData = await fetchJson(matchConfig.links.data);
    const data = normalizeVisualizationData(rawData, mode);

    renderTitle(data, matchConfig, mode);
    updateLegendState(mode);
    const chart = renderChart(data, mode);
    bindSizeControls(chart);
    bindButtonEffects();
    bindCustomLegend(id, mode);
}

function normalizeMode(mode) {
    return ['advance', 'eliminate'].includes(mode) ? mode : 'main';
}

async function getVisualizationConfig(visualizationId) {
    const eventsConfig = await fetchJson('data/config/events.json');
    for (const month of Object.values(eventsConfig.months || {})) {
        for (const event of month.events || []) {
            for (const match of event.matches || []) {
                if (!match.links?.data) continue;
                const matchId = extractVisualizationId(match.links.visualization) || match.id;
                if (matchId === visualizationId || match.id === visualizationId) {
                    return { ...match, dateRange: event.dateRange, stats: event.stats || null };
                }
            }
        }
    }
    return null;
}

function extractVisualizationId(url = '') {
    if (!url) return null;
    if (url.includes('visualization.html?id=')) {
        return new URLSearchParams(url.split('?')[1]).get('id');
    }
    return url.split('/').pop()?.replace('.html', '') || null;
}

async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`数据加载失败：${path}`);
    return response.json();
}

function normalizeVisualizationData(rawData, mode) {
    const rows = (Array.isArray(rawData.data) ? rawData.data : [])
        .filter((item) => Number(item.votes) > 0)
        .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.votes - a.votes));

    return {
        date: rawData.date || '',
        event: rawData.event || '',
        labels: rows.map((item) => `${item.name}（${item.ip}）`).reverse(),
        ranks: rows.map((item) => String(item.rank)).reverse(),
        advanceData: rows.map((item) => (!item.is_advanced || mode === 'eliminate' ? null : item.votes)).reverse(),
        eliminateData: rows.map((item) => (item.is_advanced || mode === 'advance' ? null : item.votes)).reverse()
    };
}

function updateTableLink(matchConfig) {
    const tableButton = document.querySelector('.table-btn');
    if (!tableButton) return;
    const currentFrom = new URLSearchParams(window.location.search).get('from');
    tableButton.href = `${matchConfig.links.table}${currentFrom ? `?from=${currentFrom}` : ''}`;
}

function renderTitle(data, matchConfig, mode) {
    const chartWrapper = document.querySelector('.chart-wrapper');
    const chartContainer = document.getElementById('vote_chart');
    if (!chartWrapper || !chartContainer) return;

    chartWrapper.querySelector('.title-container')?.remove();
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.width = '100%';
    svg.style.height = '75px';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'titleGradient';
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    [
        { offset: '0%', color: '#ff6b6b' },
        { offset: '40%', color: '#4a90e2' },
        { offset: '100%', color: '#3eaf7c' }
    ].forEach((stop) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        el.setAttribute('offset', stop.offset);
        el.setAttribute('stop-color', stop.color);
        gradient.appendChild(el);
    });
    defs.appendChild(gradient);
    svg.appendChild(defs);

    appendSvgText(svg, `${data.date} - ${data.event}`, 25, { 'font-weight': 'bold', fill: 'url(#titleGradient)' }, '24px');
    appendSvgText(svg, getSubtitle(matchConfig, mode), 50, { fill: '#9370DB' }, '14px');
    appendSvgText(svg, mode === 'main' ? '点击图例可切换到单独视图' : '点击图例可返回完整视图', 70, { fill: '#9370DB' }, '14px');

    titleContainer.appendChild(svg);
    chartWrapper.insertBefore(titleContainer, chartContainer);
}

function appendSvgText(svg, text, y, attrs, fontSize) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    node.textContent = text;
    node.setAttribute('x', '50%');
    node.setAttribute('y', String(y));
    node.setAttribute('text-anchor', 'middle');
    node.style.fontSize = fontSize;
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    svg.appendChild(node);
}

function getSubtitle(matchConfig, mode) {
    const base = matchConfig.details?.qualified?.description || '';
    if (mode === 'advance') return `${base} · 仅显示晋级`;
    if (mode === 'eliminate') return `${base} · 仅显示未晋级`;
    return base;
}

function updateLegendState(mode) {
    const items = {
        advance: document.querySelector('.legend-item[data-series="advance"]'),
        eliminate: document.querySelector('.legend-item[data-series="eliminate"]')
    };
    Object.values(items).forEach((item) => {
        if (!item) return;
        item.classList.remove('inactive');
        item.style.opacity = '1';
    });
    if (mode === 'advance' && items.eliminate) {
        items.eliminate.classList.add('inactive');
        items.eliminate.style.opacity = '0.45';
    }
    if (mode === 'eliminate' && items.advance) {
        items.advance.classList.add('inactive');
        items.advance.style.opacity = '0.45';
    }
}

function renderChart(data, mode) {
    const chartElement = document.getElementById('vote_chart');
    chartElement.style.maxWidth = `${DEFAULT_SIZE.width}px`;
    chartElement.style.height = `${DEFAULT_SIZE.height}px`;
    chartElement.parentElement.style.maxWidth = `${DEFAULT_SIZE.width}px`;

    const chart = echarts.init(chartElement, RENDER_CONFIG.theme, { renderer: RENDER_CONFIG.renderer });
    const option = buildChartOption(data, mode);
    option.grid = RENDER_CONFIG.grid;
    chart.setOption(option);
    window.chart_vote_chart = chart;
    window.addEventListener('resize', () => chart.resize());
    return chart;
}

function buildChartOption(data, mode) {
    const series = [];
    if (mode !== 'eliminate') series.push(buildSeries('晋级', data.advanceData, data.labels, '#3d7644', '#3e9d65'));
    if (mode !== 'advance') series.push(buildSeries('未晋级', data.eliminateData, data.labels, '#744444', '#a65d5d'));

    return {
        backgroundColor: '#1a1a1a',
        title: { text: '', subtext: '', left: 'center', top: 0, textStyle: { color: 'transparent' }, subtextStyle: { color: 'transparent' } },
        tooltip: {
            trigger: 'axis',
            textStyle: { color: '#a6c1ee', fontFamily: 'Microsoft YaHei', fontSize: 14 },
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            borderWidth: 0,
            formatter(params) {
                const target = params.find((item) => item.value !== null && !Number.isNaN(item.value));
                return target ? `${target.seriesName}<br/>${data.labels[target.dataIndex]}<br/>得票数：${target.value}票<br/>排名：${data.ranks[target.dataIndex]}` : '';
            }
        },
        legend: { show: false, data: ['晋级', '未晋级'] },
        xAxis: {
            position: 'center',
            name: '得票数',
            nameLocation: 'end',
            axisLabel: { fontSize: 12, fontFamily: 'Microsoft YaHei' },
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.3 } }
        },
        yAxis: {
            type: 'category',
            position: 'center',
            name: '排名',
            data: data.ranks,
            axisLabel: { formatter: '{value}', interval: 0, fontFamily: 'Microsoft YaHei' },
            axisLine: { lineStyle: { color: '#333' } }
        },
        series
    };
}

function buildSeries(name, values, labels, startColor, endColor) {
    return {
        type: 'bar',
        name,
        data: values,
        barGap: '0%',
        barCategoryGap: '40%',
        label: {
            show: true,
            position: 'right',
            formatter(params) {
                return params.value === null ? '' : `{vote|${params.value}票}{name| - ${labels[params.dataIndex]}}`;
            },
            rich: {
                vote: { color: '#ff7875', fontSize: 13, fontWeight: 'bold', padding: [0, 5, 0, 5] },
                name: { color: '#a6c1ee', fontSize: 12 }
            }
        },
        itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: startColor },
                { offset: 0.5, color: endColor },
                { offset: 1, color: endColor }
            ])
        }
    };
}

function bindSizeControls(chart) {
    const widthSlider = document.getElementById('width-slider');
    const heightSlider = document.getElementById('height-slider');
    const widthValue = document.getElementById('width-value');
    const heightValue = document.getElementById('height-value');
    const chartContainer = document.querySelector('.chart-container');
    const chartWrapper = document.querySelector('.chart-wrapper');
    const resetBtn = document.getElementById('reset-size');

    const updateSize = () => {
        const width = Math.min(Math.max(Number(widthSlider.value), 100), 2500);
        const height = Math.min(Math.max(Number(heightSlider.value), 100), 5000);
        widthValue.textContent = String(width);
        heightValue.textContent = String(height);
        chartContainer.style.maxWidth = `${width}px`;
        chartWrapper.style.maxWidth = `${width}px`;
        chartContainer.style.height = `${height}px`;
        chart.resize();
    };

    resetBtn.addEventListener('click', () => {
        widthSlider.value = String(DEFAULT_SIZE.width);
        heightSlider.value = String(DEFAULT_SIZE.height);
        updateSize();
    });
    widthSlider.addEventListener('input', updateSize);
    heightSlider.addEventListener('input', updateSize);
    resetBtn.click();
}

function bindCustomLegend(id, mode) {
    document.querySelectorAll('.legend-item').forEach((item) => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => navigateToVisualization(id, getNextMode(item.dataset.series, mode)));
    });
}

function getNextMode(series, mode) {
    if (mode === 'main') return series === 'advance' ? 'eliminate' : 'advance';
    if (mode === 'advance') return series === 'advance' ? 'main' : 'advance';
    return series === 'eliminate' ? 'main' : 'eliminate';
}

function navigateToVisualization(id, mode) {
    const params = new URLSearchParams({ id });
    if (mode !== 'main') params.set('mode', mode);
    const currentFrom = new URLSearchParams(window.location.search).get('from');
    if (currentFrom) params.set('from', currentFrom);
    window.location.href = `pages/visualization/visualization.html?${params.toString()}`;
}

function bindButtonEffects() {
    document.querySelectorAll('.home-btn, .table-btn').forEach((button) => {
        button.addEventListener('mouseenter', function() { this.style.transform = 'scale(1.05)'; });
        button.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; });
    });
}

function renderError(message) {
    const chartWrapper = document.querySelector('.chart-wrapper');
    if (chartWrapper) chartWrapper.innerHTML = `<div class="error-message">${message}</div>`;
}
