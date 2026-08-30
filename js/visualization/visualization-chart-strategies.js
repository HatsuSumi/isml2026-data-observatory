function hasVoteValue(value) {
    return Number.isFinite(value) && value >= 0;
}

function buildSeries(name, values, labels, startColor, endColor, type = 'bar') {
    const series = {
        type,
        name,
        data: values,
        label: {
            show: true,
            formatter(params) {
                return hasVoteValue(params.value)
                    ? `{vote|${params.value}票}{name| - ${labels[params.dataIndex]}}`
                    : '';
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

    if (type === 'line') {
        series.smooth = true;
        series.symbolSize = 8;
        series.lineStyle = { width: 3 };
        series.connectNulls = false;
    } else {
        series.barGap = '0%';
        series.barCategoryGap = '40%';
        series.label.position = 'right';
    }

    return series;
}

function buildBaseOption() {
    return {
        backgroundColor: '#1a1a1a',
        title: { text: '', subtext: '', left: 'center', top: 0, textStyle: { color: 'transparent' }, subtextStyle: { color: 'transparent' } },
        legend: { show: false, data: ['晋级', '未晋级'] },
        tooltip: {
            textStyle: { color: '#a6c1ee', fontFamily: 'Microsoft YaHei', fontSize: 14 },
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            borderWidth: 0
        }
    };
}

function buildBarOption(data, mode) {
    const series = [];
    if (mode !== 'eliminate') series.push(buildSeries('晋级', data.advanceData, data.labels, '#3d7644', '#3e9d65'));
    if (mode !== 'advance') series.push(buildSeries('未晋级', data.eliminateData, data.labels, '#744444', '#a65d5d'));

    return {
        ...buildBaseOption(),
        tooltip: {
            ...buildBaseOption().tooltip,
            trigger: 'axis',
            formatter(params) {
                const target = params.find((item) => hasVoteValue(item.value));
                return target ? `${target.seriesName}<br/>${data.labels[target.dataIndex]}<br/>得票数：${target.value}票<br/>排名：${data.ranks[target.dataIndex]}` : '';
            }
        },
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

function buildLineOption(data, mode) {
    const option = buildBarOption(data, mode);
    option.xAxis = { type: 'category', name: '角色', data: data.labels, axisLabel: { interval: 0, rotate: 45 } };
    option.yAxis = { type: 'value', name: '得票数', splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.3 } } };
    option.series = option.series.map((series) => ({ ...series, type: 'line', label: { show: false } }));
    option.tooltip.trigger = 'axis';
    return option;
}

function buildPieOption(data, mode) {
    const slices = [];
    if (mode !== 'eliminate') {
        slices.push({ name: '晋级', value: data.advanceData.filter(hasVoteValue).reduce((sum, value) => sum + value, 0) });
    }
    if (mode !== 'advance') {
        slices.push({ name: '未晋级', value: data.eliminateData.filter(hasVoteValue).reduce((sum, value) => sum + value, 0) });
    }

    return {
        ...buildBaseOption(),
        tooltip: { ...buildBaseOption().tooltip, trigger: 'item', formatter: '{b}<br/>得票数：{c}票（{d}%）' },
        series: [{
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['50%', '50%'],
            data: slices,
            label: { color: '#a6c1ee', formatter: '{b}\n{c}票（{d}%）' },
            itemStyle: { borderColor: '#1a1a1a', borderWidth: 2 }
        }]
    };
}

export const CHART_STRATEGIES = {
    bar: { buildOption: buildBarOption },
    line: { buildOption: buildLineOption },
    pie: { buildOption: buildPieOption }
};

export function getChartStrategy(chartType = 'bar') {
    return CHART_STRATEGIES[chartType] || CHART_STRATEGIES.bar;
}
