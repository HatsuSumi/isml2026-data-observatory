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
    const advanceLabel = data.statusLabels?.advance || '晋级';
    const eliminateLabel = data.statusLabels?.eliminate || '未晋级';
    const series = [];
    if (mode !== 'eliminate') series.push(buildSeries(advanceLabel, data.advanceData, data.labels, '#3d7644', '#3e9d65'));
    if (mode !== 'advance') series.push(buildSeries(eliminateLabel, data.eliminateData, data.labels, '#744444', '#a65d5d'));

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
    const groups = data.groups.map((group) => ({
        ...group,
        rows: group.rows.filter((row) => {
            if (mode === 'advance') return row.isPromoted;
            if (mode === 'eliminate') return !row.isPromoted;
            return true;
        })
    })).filter((group) => group.rows.length > 0);
    const columns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
    const rows = Math.max(1, Math.ceil(groups.length / columns));
    const maxOverkill = Math.max(...groups.map((group) => group.metrics?.overkill ?? -Infinity));
    const formatMetric = (value, suffix = '') => Number.isFinite(value) ? `${value}${suffix}` : '—';
    const metricTitles = groups.map((group, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const metrics = group.metrics || {};
        const top = `${((row + 0.8) / rows) * 100}%`;
        const left = `${((column + 0.5) / columns) * 100}%`;
        const isMaxOverkill = Number.isFinite(metrics.overkill) && metrics.overkill === maxOverkill;
        const overkillText = Number.isFinite(metrics.overkill) ? `${metrics.overkill.toFixed(2)}倍` : '—';
        return {
            text: `{normal|票仓：${formatMetric(metrics.votePool, '票')}　票差：${formatMetric(metrics.voteDifference, '票')}}\n${isMaxOverkill ? '{highlight|倍杀：' : '{normal|倍杀：'}${overkillText}${isMaxOverkill ? '}' : '}'}{normal|　弃票率：${Number.isFinite(metrics.invalidVoteRate) ? `${metrics.invalidVoteRate.toFixed(2)}%` : '—'}}`,
            left,
            top,
            textAlign: 'center',
            textStyle: {
                color: '#a6c1ee',
                fontSize: 13,
                fontWeight: 'normal',
                lineHeight: 20,
                rich: {
                    normal: {
                        color: '#a6c1ee',
                        fontSize: 13,
                        fontWeight: 'normal'
                    },
                    highlight: {
                        color: '#ffd166',
                        fontSize: 14,
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 209, 102, 0.12)',
                        borderColor: '#ffd166',
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: [2, 4]
                    }
                }
            }
        };
    });
    const series = groups.map((group, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const centerX = `${((column + 0.5) / columns) * 100}%`;
        const centerY = `${((row + 0.38) / rows) * 100}%`;
        const metrics = group.metrics || {};
        return {
            name: group.name,
            type: 'pie',
            radius: '11%',
            center: [centerX, centerY],
            data: group.rows.map((item) => ({
                name: item.label,
                value: item.votes,
                rank: item.displayRank,
                globalRank: item.globalRank,
                isPromoted: item.isPromoted,
                itemStyle: {
                    color: item.isPromoted ? '#3e9d65' : '#a65d5d'
                }
            })),
            label: {
                color: '#dbe7f5',
                fontSize: 12,
                formatter: '{b}\n{c}票（{d}%）'
            },
            labelLine: { lineStyle: { color: '#718096' } },
            itemStyle: { borderColor: '#1a1a1a', borderWidth: 2 }
        };
    });

    return {
        ...buildBaseOption(),
        tooltip: {
            ...buildBaseOption().tooltip,
            trigger: 'item',
            formatter(params) {
                const rank = params.data?.globalRank ? `<br/>全局排名：第${params.data.globalRank}名` : '';
                return `${params.seriesName}<br/>${params.name}<br/>得票数：${params.value}票（${params.percent}%）${rank}`;
            }
        },
        title: metricTitles,
        series
    };
}

function buildNecklaceOption(data) {
    const colors = ['#ff7875', '#67c7ff', '#ffd166', '#7bd88f', '#c792ea', '#f78c6c', '#82aaff', '#c3e88d'];
    return {
        backgroundColor: '#1a1a1a',
        tooltip: {
            trigger: 'axis',
            textStyle: { color: '#a6c1ee', fontFamily: 'Microsoft YaHei', fontSize: 14 },
            backgroundColor: 'rgba(50, 50, 50, .92)',
            borderWidth: 0,
            formatter(params) {
                return params.filter((item) => hasVoteValue(item.value)).map((item) => `${item.marker}${item.seriesName}：${item.value}票`).join('<br/>');
            }
        },
        legend: { show: true, type: 'scroll', textStyle: { color: '#dbe7f5' }, data: data.contestants.map((item) => item.label) },
        grid: { left: '8%', right: '8%', top: '14%', bottom: '12%', containLabel: true },
        xAxis: { type: 'category', name: '轮次', data: data.rounds, axisLabel: { color: '#dbe7f5' } },
        yAxis: { type: 'value', name: '得票数', min: 0, splitLine: { show: true, lineStyle: { type: 'dashed', opacity: .3 } }, axisLabel: { color: '#dbe7f5' } },
        series: data.contestants.map((item, index) => {
            const lastValueIndex = item.values.reduce((lastIndex, value, valueIndex) => (hasVoteValue(value) ? valueIndex : lastIndex), -1);
            return {
                type: 'line', name: item.label, data: item.values, connectNulls: false, smooth: false, symbol: 'circle', symbolSize: 8,
                label: {
                    show: true,
                    position: 'top',
                    formatter: (params) => params.dataIndex === lastValueIndex ? item.name : '',
                    color: '#dbe7f5',
                    fontSize: 12,
                    backgroundColor: 'rgba(26, 26, 26, .72)',
                    padding: [2, 4],
                    borderRadius: 2
                },
                lineStyle: { width: 3, color: colors[index % colors.length] },
                itemStyle: { color: colors[index % colors.length] }
            };
        })
    };
}

export const CHART_STRATEGIES = {
    necklace: { buildOption: buildNecklaceOption },
    bar: { buildOption: buildBarOption },
    line: { buildOption: buildLineOption },
    pie: { buildOption: buildPieOption }
};

export function getChartStrategy(chartType = 'bar') {
    return CHART_STRATEGIES[chartType] || CHART_STRATEGIES.bar;
}
