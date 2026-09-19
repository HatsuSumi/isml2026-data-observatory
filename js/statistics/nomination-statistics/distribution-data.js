export function requireElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`分布页缺少必要元素 ${selector}`);
    return element;
}

export function requireFunction(value, name) {
    if (typeof value !== 'function') {
        throw new Error(`分布页配置错误：${name} 必须是函数`);
    }
    return value;
}

function requireStatsList(data, path) {
    const keys = path.split('.');
    let current = data;
    for (const key of keys) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            throw new Error(`提名统计数据缺少 ${path}`);
        }
        current = current[key];
    }
    if (!Array.isArray(current)) {
        throw new Error(`提名统计数据 ${path} 必须是数组`);
    }
    return current;
}

function requireFilterInputs(root, name) {
    const inputs = Array.from(root.querySelectorAll(`input[name="${name}"]`));
    if (inputs.length === 0) throw new Error(`分布页缺少 ${name} 筛选`);
    return inputs.filter(input => input.checked).map(input => input.value);
}

export function getDistributionFilters(root = document) {
    const group = root.querySelector('input[name="group"]:checked');
    if (!group) throw new Error('分布页缺少组别筛选');
    if (group.value !== 'stellar' && group.value !== 'nova') {
        throw new Error(`分布页组别无效：${group.value}`);
    }
    return {
        group: group.value,
        gender: requireFilterInputs(root, 'gender'),
        seasons: requireFilterInputs(root, 'season'),
        status: requireFilterInputs(root, 'status')
    };
}

export function filterNominationCharacters(data, filters) {
    if (!data || typeof data !== 'object') {
        throw new Error('提名统计数据必须是对象');
    }

    const characters = [];
    const genders = filters.gender;
    genders.forEach(gender => {
        if (gender !== 'female' && gender !== 'male') {
            throw new Error(`分布页性别筛选无效：${gender}`);
        }
    });

    if (filters.group === 'stellar') {
        genders.forEach(gender => {
            requireStatsList(data, `stellar.${gender}`).forEach(character => {
                characters.push({ ...character, gender });
            });
        });
    } else {
        filters.seasons.forEach(season => {
            if (!['winter', 'spring', 'summer', 'autumn'].includes(season)) {
                throw new Error(`分布页季节筛选无效：${season}`);
            }
            genders.forEach(gender => {
                requireStatsList(data, `nova.${season}.${gender}`).forEach(character => {
                    characters.push({ ...character, gender, season });
                });
            });
        });
    }

    if (filters.status.length === 0) return characters;
    return characters.filter(character => {
        if (character.status !== '晋级' && character.status !== '未晋级') {
            throw new Error(`提名统计状态无效：${character.status}`);
        }
        return filters.status.includes(character.status === '晋级' ? 'advance' : 'eliminate');
    });
}

export function cleanSearchText(text) {
    if (text == null) throw new Error('搜索文本不能为空值');
    return String(text)
        .toLowerCase()
        .replace(/[（）()[\]【】「」『』《》〈〉""'']/g, '')
        .replace(/[、，。！？：；.,!?:;]/g, '')
        .replace(/\s+/g, '');
}

export function matchesSearchText(value, query) {
    if (typeof query !== 'string') throw new Error('搜索关键词必须是字符串');
    if (value == null) throw new Error('搜索匹配值不能为空');
    return cleanSearchText(value).includes(query);
}

export function nominationVoteRank(votes) {
    if (votes === '-') return Number.POSITIVE_INFINITY;
    const count = Number(votes);
    if (!Number.isFinite(count)) {
        throw new Error(`提名得票数无效：${votes}`);
    }
    return count;
}

export function compareNominationVotes(left, right) {
    const leftRank = nominationVoteRank(left.votes);
    const rightRank = nominationVoteRank(right.votes);
    if (leftRank === rightRank) return 0;
    return rightRank - leftRank;
}

export function sortDistributionRows(rows, column, direction, textColumns) {
    if (!Array.isArray(rows)) throw new Error('分布页排序数据必须是数组');
    if (typeof column !== 'string' || column === '') throw new Error('分布页排序列无效');
    if (direction !== 'asc' && direction !== 'desc') throw new Error('分布页排序方向无效');
    if (!Array.isArray(textColumns)) throw new Error('分布页文本列配置必须是数组');

    const textKeys = new Set(textColumns);
    return [...rows].sort((a, b) => {
        let left = a[column];
        let right = b[column];

        if (column === 'percentage') {
            left = parseFloat(left);
            right = parseFloat(right);
        } else if (textKeys.has(column)) {
            if (left == null || right == null) {
                throw new Error(`分布页排序值无效：${column}`);
            }
            left = String(left);
            right = String(right);
            return direction === 'asc' ? left.localeCompare(right, 'zh') : right.localeCompare(left, 'zh');
        }

        left = Number(left);
        right = Number(right);
        if (!Number.isFinite(left) || !Number.isFinite(right)) {
            throw new Error(`分布页排序值无效：${column}`);
        }
        return direction === 'asc' ? left - right : right - left;
    });
}
