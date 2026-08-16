import { averageVotes, formatPercentage, percentage, sumVotes } from './VoteCalculator.js';

function sortByValue(values) {
    return values
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value || a.index - b.index);
}

export function calculateGroupTotal(groups, totalVotes) {
    const totals = groups.map(sumVotes);
    const allGroupsTotal = totals.reduce((total, value) => total + value, 0);
    const sorted = sortByValue(totals);

    return {
        groups: sorted.map(entry => groups[entry.index]),
        comparisons: sorted.map((entry, index) => {
            const nextTotal = sorted[index + 1]?.value;
            return {
                total: entry.value,
                voteRate: formatPercentage(percentage(entry.value, allGroupsTotal)),
                diff: nextTotal === undefined ? null : entry.value - nextTotal,
                rank: index + 1
            };
        }),
        allGroupsTotal,
        totalVotes
    };
}

export function calculateGroupAverage(groups, totalVotes) {
    const averages = groups.map(averageVotes);
    const allGroupsAverage = averages.length === 0
        ? 0
        : averages.reduce((total, value) => total + value, 0) / averages.length;
    const sorted = sortByValue(averages);

    return {
        groups: sorted.map(entry => groups[entry.index]),
        comparisons: sorted.map((entry, index) => {
            const nextAverage = sorted[index + 1]?.value;
            return {
                avg: Number(entry.value.toFixed(1)),
                voteRate: formatPercentage(percentage(entry.value, allGroupsAverage)),
                diff: nextAverage === undefined ? null : Number((entry.value - nextAverage).toFixed(1)),
                rank: index + 1
            };
        }),
        allGroupsAverage,
        totalVotes
    };
}

export function calculateGroupBaseTotal(groups, totalVotes) {
    const totals = groups.map(sumVotes);
    const baseTotal = totals[0] ?? 0;
    const allGroupsTotal = totals.reduce((total, value) => total + value, 0);

    return {
        groups,
        comparisons: totals.map((total, index) => ({
            total,
            voteRate: formatPercentage(percentage(total, allGroupsTotal)),
            baseDiff: total - baseTotal,
            rateDiff: formatPercentage(percentage(total - baseTotal, allGroupsTotal)),
            isLeading: total > baseTotal,
            isBase: index === 0
        })),
        totalVotes,
        allGroupsTotal
    };
}

export function calculateGroupBaseAverage(groups, totalVotes) {
    const averages = groups.map(averageVotes);
    const baseAverage = averages[0] ?? 0;
    const allGroupsTotal = groups.reduce((total, group) => total + sumVotes(group), 0);
    const groupAverage = groups.length === 0 ? 0 : allGroupsTotal / groups.length;

    return {
        groups,
        comparisons: averages.map((average, index) => ({
            avg: average,
            voteRate: formatPercentage(percentage(average, groupAverage)),
            baseDiff: average - baseAverage,
            rateDiff: formatPercentage(percentage(average - baseAverage, baseAverage)),
            isLeading: average > baseAverage,
            isBase: index === 0
        })),
        totalVotes,
        allGroupsTotal
    };
}
