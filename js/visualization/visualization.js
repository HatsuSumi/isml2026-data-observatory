import { loadEventData, loadNecklaceData, loadPreliminariesData, loadPhase1Data } from '../common/data-loader.js';
import { getVisualizationStrategy } from './visualization-strategies.js';
import { getChartStrategy } from './visualization-chart-strategies.js';



document.addEventListener('DOMContentLoaded', () => {
    initVisualization().catch((error) => {
        console.error('可视化初始化失败:', error);
        renderError(error instanceof Error ? error.message : '可视化加载失败');
    });
});

const SUPPORTED_CHART_TYPES = new Set(['bar', 'line', 'pie']);
const DEFAULT_CHART_TYPE = 'bar';
const DEFAULT_SIZE = { width: 1800, height: 2200 };
const LINE_SIZE = { width: 1800, height: 1200 };
const PIE_SIZE = { width: 1400, height: 1500 };

let visualizationState;

const RENDER_CONFIG = {
    grid: { left: '15%', right: '15%', top: '2%', bottom: '5%', containLabel: true },
    theme: 'dark',
    renderer: 'canvas'
};

function renderError(message) {
    const chartContainer = document.getElementById('vote_chart');
    if (!chartContainer) {
        throw new Error('可视化页面缺少图表容器：#vote_chart');
    }

    chartContainer.replaceChildren();
    chartContainer.textContent = message;
    chartContainer.classList.add('is-error');
}

async function initVisualization() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const mode = normalizeMode(params.get('mode'));
    const chartType = params.get('chart');

    if (!id) throw new Error('缺少可视化 id 参数');

    const matchConfig = await getVisualizationConfig(id);
    if (!matchConfig) throw new Error(`未找到可视化配置：${id}`);

    updateTableLink(matchConfig);
    const rawData = await loadVisualizationData(matchConfig);
    const strategy = getVisualizationStrategy(id);
    const data = strategy.normalize(rawData, mode, matchConfig);
    visualizationState = {
        id,
        mode,
        matchConfig,
        data,
        chartType: matchConfig.id?.startsWith('phase1-r06-necklace-') ? 'necklace' : SUPPORTED_CHART_TYPES.has(chartType) ? chartType : getVisualizationChartType(matchConfig),
        chart: null,
        sizeControlsBound: false
    };

    initializeSizeControls();
    renderVisualization();
}

function renderVisualization() {
    const { data, matchConfig, mode, chartType } = visualizationState;
    renderTitle(data, matchConfig, mode, chartType);
    updateLegendState(mode, data.statusLabels);
    const chartSize = chartType === 'pie' ? PIE_SIZE : chartType === 'necklace' ? LINE_SIZE : DEFAULT_SIZE;
    visualizationState.chart?.dispose();
    if (visualizationState.resizeHandler) {
        window.removeEventListener('resize', visualizationState.resizeHandler);
        visualizationState.resizeHandler = null;
    }
    visualizationState.chart = renderChart(data, mode, getChartStrategy(chartType), chartType, chartSize);
    const sizeControls = document.querySelector('.size-controls');
    if (sizeControls) sizeControls.hidden = chartType === 'pie';
    syncSizeControls(chartSize);
    updateChartToggleButton(chartType);
    bindCustomLegend(visualizationState.id, mode, chartType);
}

function updateChartToggleButton(chartType) {
    const button = document.querySelector('.chart-toggle-btn');
    if (!button) return;
    const canToggle = visualizationState.id.startsWith('phase1-')
        && !visualizationState.id.startsWith('phase1-r06-necklace-')
        && !visualizationState.id.startsWith('phase1-r06-wildcard-');
    button.hidden = !canToggle;
    button.textContent = chartType === 'pie' ? '切换为柱状图' : '切换为饼图';
    button.setAttribute('aria-label', button.textContent);
    button.setAttribute('aria-pressed', String(chartType === 'bar'));
    button.onclick = () => {
        visualizationState.chartType = visualizationState.chartType === 'pie' ? 'bar' : 'pie';
        renderVisualization();
    };
}

function normalizeMode(mode) {
    return ['advance', 'eliminate'].includes(mode) ? mode : 'main';
}

function getVisualizationChartType(matchConfig) {
    const configuredType = matchConfig.chartType || matchConfig.visualization?.chartType;
    if (!configuredType) return DEFAULT_CHART_TYPE;
    if (!SUPPORTED_CHART_TYPES.has(configuredType)) {
        throw new Error(`可视化配置错误：不支持图表类型「${configuredType}」`);
    }
    return configuredType;
}

async function getVisualizationConfig(visualizationId) {
    const eventsDataConfig = await loadEventData();
    const eventsConfig = eventsDataConfig.events || eventsDataConfig;
    for (const month of Object.values(eventsConfig.months || {})) {
        for (const event of month.events || []) {
            for (const match of event.matches || []) {
                const matchId = extractVisualizationId(match.links?.visualization) || match.id;
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
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`数据加载失败：${path}`);
    return response.json();
}

function isPreliminarySnapshotPath(path) {
    return String(path || '').includes('data/preliminaries/');
}

async function loadVisualizationData(matchConfig) {
    if (isPreliminarySnapshotPath(matchConfig.links?.data)) {
        return loadPreliminariesData(matchConfig.links.data);
    }
    if (String(matchConfig.links?.data || '').includes('necklace-')) {
        return loadNecklaceData(matchConfig.links.data);
    }
    if (String(matchConfig.links?.data || '').includes('data/phase1/')) {
        return loadPhase1Data(matchConfig.links.data);
    }
    return fetchJson(matchConfig.links.data);
}

function appendQueryParam(url, key, value) {
    if (!url || !value) return url;
    const [base, hash = ''] = url.split('#');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ''}`;
}

function updateTableLink(matchConfig) {
    const tableButton = document.querySelector('.table-btn');
    if (!tableButton) return;

    const tableUrl = matchConfig.links?.table;
    if (!tableUrl) {
        tableButton.hidden = true;
        return;
    }

    const currentFrom = new URLSearchParams(window.location.search).get('from');
    tableButton.hidden = false;
    tableButton.href = appendQueryParam(tableUrl, 'from', currentFrom);
}

function renderTitle(data, matchConfig, mode, chartType) {
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
    appendSvgText(svg, getChartHint(matchConfig, mode, chartType), 70, { fill: '#9370DB' }, '14px');

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

function getChartHint(matchConfig, mode, chartType) {
    if (chartType === 'necklace') return '折线图展示8名角色在7个淘汰轮次中的票数变化';
    if (chartType === 'pie') return '各擂台饼图展示组内得票占比';
    if (mode !== 'main') return '点击图例可切换到单独视图';
    const isPhase1 = matchConfig.id?.startsWith('phase1-') || String(matchConfig.links?.data || '').includes('data/phase1/');
    return isPhase1 ? '柱状图展示全局票数排名' : '点击图例可切换到单独视图';
}

function updateLegendState(mode, statusLabels) {
    const items = {
        advance: document.querySelector('.legend-item[data-series="advance"]'),
        eliminate: document.querySelector('.legend-item[data-series="eliminate"]')
    };
    items.advance?.querySelector('.legend-text').replaceChildren(document.createTextNode(statusLabels.advance));
    items.eliminate?.querySelector('.legend-text').replaceChildren(document.createTextNode(statusLabels.eliminate));
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

function renderChart(data, mode, chartStrategy, chartType, chartSize) {
    const chartElement = document.getElementById('vote_chart');
    applyChartSize(chartSize);
    document.querySelector('.custom-legend')?.classList.toggle('is-hidden', chartType === 'pie' || chartType === 'necklace');

    const chart = echarts.init(chartElement, RENDER_CONFIG.theme, { renderer: RENDER_CONFIG.renderer });
    const option = chartStrategy.buildOption(data, mode);
    if (chartType === 'bar') option.grid = RENDER_CONFIG.grid;
    chart.setOption(option);
    chart.resize(chartSize);
    window.chart_vote_chart = chart;
    visualizationState.resizeHandler = () => chart.resize();
    window.addEventListener('resize', visualizationState.resizeHandler);
    return chart;
}

function hasVoteValue(value) {
    return Number.isFinite(value) && value >= 0;
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
                const target = params.find((item) => hasVoteValue(item.value));
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
                return hasVoteValue(params.value) ? `{vote|${params.value}票}{name| - ${labels[params.dataIndex]}}` : '';
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

function getChartSizeElements() {
    return {
        widthSlider: document.getElementById('width-slider'),
        heightSlider: document.getElementById('height-slider'),
        widthValue: document.getElementById('width-value'),
        heightValue: document.getElementById('height-value'),
        chartContainer: document.getElementById('vote_chart'),
        chartWrapper: document.querySelector('.chart-wrapper'),
        titleContainer: document.querySelector('.title-container'),
        resetBtn: document.getElementById('reset-size')
    };
}

function clampSliderValue(slider) {
    const value = Number(slider.value);
    return Math.min(Math.max(value, Number(slider.min)), Number(slider.max));
}

function applyChartSize({ width, height }, chart = null) {
    const { chartContainer, chartWrapper, titleContainer, widthValue, heightValue } = getChartSizeElements();
    if (!chartContainer || !chartWrapper) {
        throw new Error('可视化页面缺少图表尺寸容器');
    }

    const widthPx = `${width}px`;
    const heightPx = `${height}px`;
    chartContainer.style.width = widthPx;
    chartContainer.style.maxWidth = widthPx;
    chartContainer.style.height = heightPx;
    chartContainer.style.setProperty('--chart-width', widthPx);
    chartContainer.style.setProperty('--chart-height', heightPx);
    chartWrapper.style.width = widthPx;
    chartWrapper.style.maxWidth = widthPx;
    chartWrapper.style.setProperty('--chart-width', widthPx);
    titleContainer?.style.setProperty('--chart-width', widthPx);
    widthValue.textContent = String(width);
    heightValue.textContent = String(height);
    chart?.resize({ width, height });
}

function initializeSizeControls() {
    const { widthSlider, heightSlider, resetBtn } = getChartSizeElements();
    if (!widthSlider || !heightSlider || !resetBtn) {
        throw new Error('可视化页面缺少尺寸控制元素');
    }
    if (visualizationState.sizeControlsBound) return;

    const updateSize = () => {
        applyChartSize({
            width: clampSliderValue(widthSlider),
            height: clampSliderValue(heightSlider)
        }, visualizationState.chart);
    };

    resetBtn.addEventListener('click', () => {
        const defaultSize = visualizationState.chartType === 'pie'
            ? PIE_SIZE
            : visualizationState.chartType === 'necklace'
                ? LINE_SIZE
                : DEFAULT_SIZE;
        widthSlider.value = String(defaultSize.width);
        heightSlider.value = String(defaultSize.height);
        updateSize();
    });
    widthSlider.addEventListener('input', updateSize);
    heightSlider.addEventListener('input', updateSize);
    visualizationState.sizeControlsBound = true;
}

function syncSizeControls(defaultSize) {
    const { widthSlider, heightSlider } = getChartSizeElements();
    if (!widthSlider || !heightSlider) return;
    widthSlider.value = String(defaultSize.width);
    heightSlider.value = String(defaultSize.height);
    applyChartSize(defaultSize, visualizationState.chart);
}

function bindCustomLegend(id, mode, chartType) {
    if (chartType === 'pie') return;
    document.querySelectorAll('.legend-item').forEach((item) => {
        item.classList.toggle('is-clickable', chartType !== 'pie');
        item.onclick = chartType === 'pie'
            ? null
            : () => navigateToVisualization(id, getNextMode(item.dataset.series, mode));
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
    if (visualizationState?.chartType) params.set('chart', visualizationState.chartType);
    const currentFrom = new URLSearchParams(window.location.search).get('from');
    if (currentFrom) params.set('from', currentFrom);
    window.location.href = `pages/visualization/visualization.html?${params.toString()}`;
}

function bindButtonEffects() {}

