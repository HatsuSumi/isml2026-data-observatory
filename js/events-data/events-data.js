import { smoothScrollTo as scrollWindowTo } from '../common/dom.js';

let observer;
let eventsData;
let nav;

const templates = {
    eventsPage: document.getElementById('events-page-template'),
    eventCard: document.getElementById('event-card-template'),
    monthSection: document.getElementById('month-section-template'),
    dateSection: document.getElementById('date-section-template'),
    phaseSection: document.getElementById('phase-section-template'),
    groupSection: document.getElementById('group-section-template')
};

// 添加常量
const SCROLL_POSITION_KEY = 'events_scroll_position';
const RETURN_FROM_KEY = 'return_from_event';

const TITLE_MAPPING = {
    '预选赛第一轮': [
        { 
            title: '恒星女子组', 
            format: '赞成投票制',
            description: 'A组'
        }, 
        { 
            title: '恒星男子组', 
            format: '赞成投票制',
            description: 'A组'
        }
    ],
    '预选赛第二轮': [
        { 
            title: '恒星女子组', 
            format: '赞成投票制',
            description: 'B组'
        }, 
        { 
            title: '恒星男子组', 
            format: '赞成投票制',
            description: 'B组'
        }
    ]
};

// 添加一个函数来找到下一场比赛的开始时间
function findNextEventStartTime(data) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    let nextStartTime = null;
    
    // 遍历所有月份和事件，找到最近的未开始的比赛
    for (const [monthKey, month] of Object.entries(data.months)) {
        month.events.forEach(event => {
            // 根据是否重赛选择开始日期
            const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
                ? new Date(event.dateRange.Restart)
                : new Date(event.dateRange.start);
            
            startDate.setHours(0, 0, 0, 0);
            
            if (startDate > now) {
                if (!nextStartTime || startDate < nextStartTime) {
                    nextStartTime = startDate;
                }
            }
        });
    }
    
    return nextStartTime;
}

function getEventStatus(event, nextEventStartTime) {
    if (event.status === 'postponed') {
        return 'postponed';
    }
    
    const now = new Date();
    
    // 根据是否重赛选择开始和结束日期
    const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
        ? new Date(event.dateRange.Restart)
        : new Date(event.dateRange.start);
    
    const endDate = event.dateRange.isRescheduled && event.dateRange.Reend
        ? new Date(event.dateRange.Reend)
        : new Date(event.dateRange.end);
    
    // 设置时间为当天开始和结束
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    now.setHours(0, 0, 0, 0);
    
    if (now > endDate) {
        return 'completed';
    } else if (now >= startDate && now <= endDate) {
        return 'ongoing';
    } else if (startDate.getTime() === nextEventStartTime?.getTime()) {
        return 'upcoming';
    } else {
        return 'notstarted';
    }
}

const PHASE_TARGET_PREFIXES = {
    nomination: ['stellar-nomination', 'nova-nomination'],
    preliminary: ['preliminary-'],
    'phase-1': ['phase-1-'],
    'phase-2': ['phase-2-'],
    'phase-3': ['phase-3-'],
    'phase-4': ['phase-4-'],
    knockout: ['knockout-']
};

function resolvePhaseTarget(targetId) {
    const exactTarget = document.querySelector(`[data-phase="${targetId}"]`);
    if (exactTarget) return exactTarget;

    const prefixes = PHASE_TARGET_PREFIXES[targetId];
    if (prefixes) {
        for (const prefix of prefixes) {
            const target = document.querySelector(`[data-phase^="${prefix}"]`);
            if (target) return target;
        }
        return null;
    }

    const preliminaryRound = targetId.match(/^preliminary-(\d+)$/);
    if (preliminaryRound) {
        const round = Number.parseInt(preliminaryRound[1], 10);
        const stage = Math.ceil(round / 2);
        const gender = round % 2 === 1 ? 1 : 2;
        return document.querySelector(`[data-phase="preliminary-${stage}-${gender}"]`);
    }

    return null;
}

function resolveNavigationTargetId(phaseId) {
    const exactItem = nav.querySelector(`.elevator-nav-item[data-target="${phaseId}"]`);
    if (exactItem && !exactItem.hidden) return phaseId;

    const preliminaryPhase = phaseId.match(/^preliminary-(\d+)-(\d+)$/);
    if (preliminaryPhase) {
        const round = (Number.parseInt(preliminaryPhase[1], 10) - 1) * 2
            + Number.parseInt(preliminaryPhase[2], 10);
        return `preliminary-${round}`;
    }

    for (const [targetId, prefixes] of Object.entries(PHASE_TARGET_PREFIXES)) {
        if (prefixes.some(prefix => phaseId.startsWith(prefix))) {
            return targetId;
        }
    }

    return phaseId;
}

function syncNavigationTargets() {
    nav.querySelectorAll('.elevator-nav-item[data-target]').forEach(item => {
        item.hidden = !resolvePhaseTarget(item.dataset.target);
    });
}

// 修改链接点击事件
function withFromParam(url, from) {
    if (!url) return '#';
    const [base, hash = ''] = url.split('#');
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}from=${encodeURIComponent(from)}${hash ? `#${hash}` : ''}`;
}

function createEventLink(url, className, text, disabled = false) {
    const element = document.createElement(disabled ? 'span' : 'a');
    element.className = `event-link ${className}${disabled ? ' disabled-link' : ''}`;
    element.textContent = text;
    if (!disabled) {
        element.href = withFromParam(url, 'events-data');
        element.addEventListener('click', () => savePosition(className.includes('visualization') ? 'visualization' : 'table'));
    }
    return element;
}

function getEventLinks(match, status) {
    const fragment = document.createDocumentFragment();
    if (match.links && status === 'completed') {
        fragment.appendChild(createEventLink(match.links.visualization, 'visualization-link', '数据可视化'));
        fragment.appendChild(createEventLink(match.links.table, 'table-link', '查看表格'));
        return fragment;
    }
    fragment.appendChild(createEventLink('', 'visualization-link', '数据可视化', true));
    fragment.appendChild(createEventLink('', 'table-link', '查看表格', true));
    return fragment;
}

// 保存位置
function savePosition(from) {
    const currentPosition = window.scrollY;
    sessionStorage.setItem(SCROLL_POSITION_KEY, currentPosition.toString());
    sessionStorage.setItem(RETURN_FROM_KEY, from);
}

function createInfoRow(wrapperClass, keyText, valueText) {
    const wrapper = document.createElement('div');
    wrapper.className = wrapperClass;

    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = keyText;

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = valueText;

    wrapper.appendChild(key);
    wrapper.appendChild(value);
    return wrapper;
}

function createTopCharacterItem(item, index, topFiveData, charactersData) {
    const characterKey = `${item.name}@${item.ip}`;
    const characterData = charactersData[characterKey];
    const row = document.createElement('div');
    row.className = 'character-item';

    if (characterData?.avatar) {
        const avatar = document.createElement('div');
        avatar.className = 'character-avatar';
        const img = document.createElement('img');
        img.src = characterData.avatar;
        img.alt = item.name;
        avatar.appendChild(img);
        row.appendChild(avatar);
    }

    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(index + 1);

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = item.name;
    const ip = document.createElement('span');
    ip.className = 'ip';
    ip.textContent = `@${characterData?.ip || item.ip}`;
    name.appendChild(ip);

    const votes = document.createElement('span');
    votes.className = 'votes';
    votes.textContent = `${item.votes}票`;

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(votes);

    if (index > 0) {
        const votesDiff = topFiveData[index - 1].votes - item.votes;
        const diff = document.createElement('div');
        diff.className = 'votes-diff';
        diff.textContent = `↓${votesDiff}`;
        row.appendChild(diff);
    }

    return row;
}

function createTopCharactersSection(topFiveData, charactersData) {
    if (!topFiveData?.length) return null;
    const section = document.createElement('div');
    section.className = 'top-characters';
    const title = document.createElement('h4');
    title.className = 'top-title';
    title.textContent = '得票数 Top 5';
    const list = document.createElement('div');
    list.className = 'character-list';
    topFiveData.forEach((item, index) => {
        list.appendChild(createTopCharacterItem(item, index, topFiveData, charactersData));
    });
    section.appendChild(title);
    section.appendChild(list);
    return section;
}

function createEventCardBody(match, status, topFiveData, charactersData) {
    const fragment = document.createDocumentFragment();
    const header = document.createElement('div');
    header.className = 'event-header';
    const info = document.createElement('div');
    info.className = 'event-info';
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = match.title;
    info.appendChild(title);

    if (match.format) {
        info.appendChild(createInfoRow('voting-format-wrapper', '投票制度：', match.format));
    }
    if (match.resultDate) {
        info.appendChild(createInfoRow('result-date-wrapper', '出结果日：', formatDateTime(match.resultDate)));
    }

    header.appendChild(info);
    if (status === 'postponed') {
        const hint = document.createElement('div');
        hint.className = 'postpone-hint';
        hint.title = '该赛事已延期';
        hint.textContent = '?';
        header.appendChild(hint);
    }
    fragment.appendChild(header);

    const description = match.details?.qualified?.description;
    if (description) {
        const content = document.createElement('div');
        content.className = 'event-content';
        content.textContent = description;
        fragment.appendChild(content);
    }

    const topCharacters = createTopCharactersSection(topFiveData, charactersData);
    if (topCharacters) {
        fragment.appendChild(topCharacters);
    }

    const footer = document.createElement('div');
    footer.className = 'event-footer';
    footer.appendChild(getEventLinks(match, status));
    fragment.appendChild(footer);
    return fragment;
}

function getCurrentPhase(eventsData) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (const month of Object.values(eventsData.months)) {
        for (const event of month.events) {
            const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
                ? new Date(event.dateRange.Restart)
                : new Date(event.dateRange.start);
            
            const endDate = event.dateRange.isRescheduled && event.dateRange.Reend
                ? new Date(event.dateRange.Reend)
                : new Date(event.dateRange.end);
            
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (now >= startDate && now <= endDate) {
                const match = event.matches[0];
                if (match.phase) {
                    return match.phase;
                }
            }
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const [data, rankingData, charactersData] = await Promise.all([
            fetch("data/config/events.json").then(r => r.json()),
            fetch("data/votes/top5-rankings.json").then(r => r.json()),
            fetch("data/characters/base/characters-data.json").then(r => r.json())
        ]);
        eventsData = data;
        
        // 获取 hash
        const hash = window.location.hash.slice(1);
        
        window.createEventCard = function(event, match, nextEventStartTime) {
            const card = templates.eventCard.content.cloneNode(true).querySelector('.event-card');
            const status = getEventStatus(event, nextEventStartTime);
            const topFiveData = rankingData?.[match.title]?.top5;
            card.replaceChildren(createEventCardBody(match, status, topFiveData, charactersData));
            return card;
        }
        
        const container = document.querySelector('.container');
        const pageContent = templates.eventsPage.content.cloneNode(true).firstElementChild;
        container.replaceChildren(pageContent);
        
        // 添加电梯导航
        nav = document.createElement('nav');
        nav.className = 'elevator-nav';
        nav.innerHTML = `
            <ul class="elevator-nav-list">
                <!-- 主赛事提名阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="nomination">
                        <span>主赛事提名阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    <div class="elevator-nav-item sub-item" data-target="stellar-nomination">
                        <span>恒星组提名</span>
                    </div>
                    <div class="elevator-nav-item sub-item" data-target="nova-nomination">
                        <span>新星组提名</span>
                    </div>
                </div>
                
                <!-- 预选赛阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="preliminary">
                        <span>预选赛阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 6}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="preliminary-${round}">
                            <span>预选赛第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 第一阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="phase-1">
                        <span>第一阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 6}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="phase-1-${round}">
                            <span>第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 第二阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="phase-2">
                        <span>第二阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 6}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="phase-2-${round}">
                            <span>第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 第三阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="phase-3">
                        <span>第三阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 6}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="phase-3-${round}">
                            <span>第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 第四阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="phase-4">
                        <span>第四阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 6}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="phase-4-${round}">
                            <span>第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
                
                <!-- 淘汰赛阶段 -->
                <div class="elevator-nav-group">
                    <div class="elevator-nav-item" data-target="knockout">
                        <span>淘汰赛阶段</span>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                    ${Array.from({length: 9}, (_, i) => i + 1).map(round => `
                        <div class="elevator-nav-item sub-item" data-target="knockout-${round}">
                            <span>第${toChineseNumber(round)}轮</span>
                        </div>
                    `).join('')}
                </div>
            </ul>
        `;
        
        // 获取当前阶段
        const currentPhase = getCurrentPhase(eventsData);
        
        // 初始化导航栏状态
        nav.querySelectorAll('.elevator-nav-group').forEach(group => {
            const mainItem = group.querySelector('.elevator-nav-item');
            const phase = mainItem.textContent.trim();
            
            // 默认折叠所有组
            group.classList.add('collapsed');
            const icon = group.querySelector('.collapse-icon');
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
            
            // 如果是当前阶段，则展开
            if (currentPhase && phase.includes(currentPhase)) {
                group.classList.remove('collapsed');
                if (icon) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                }
            }
        });
        
        nav.addEventListener('click', (e) => {
            const item = e.target.closest('.elevator-nav-item');
            if (!item || !nav.contains(item)) return;

            if (item.querySelector('.collapse-icon')) {
                e.stopPropagation();
                const group = item.closest('.elevator-nav-group');
                const icon = item.querySelector('.collapse-icon');
                group.classList.toggle('collapsed');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-right');
                nav.querySelectorAll('.elevator-nav-group').forEach(otherGroup => {
                    if (otherGroup !== group && !otherGroup.classList.contains('collapsed')) {
                        otherGroup.classList.add('collapsed');
                        const otherIcon = otherGroup.querySelector('.collapse-icon');
                        otherIcon?.classList.remove('fa-chevron-down');
                        otherIcon?.classList.add('fa-chevron-right');
                    }
                });
            }

            const targetId = item.dataset.target;
            const targetElement = resolvePhaseTarget(targetId);
            if (!targetElement) {
                return;
            }
            e.preventDefault();
            scrollWindowTo(targetElement.offsetTop - 80);
            history.pushState(null, '', `./pages/events-data/events-data.html#${targetId}`);
            updateNavActiveState(targetId);
        });

        
        document.body.appendChild(nav);
        
        // 添加滚动监听
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const phase = entry.target.querySelector('.phase-header')?.textContent;
                    document.querySelectorAll('.elevator-nav a').forEach(a => {
                        a.classList.remove('active');
                        if (a.getAttribute('data-target') === phase) {
                            a.classList.add('active');
                        }
                    });
                }
            });
        }, { threshold: 0.5 });
        
        const eventsContainer = container.querySelector('.events-container');
        const nextEventStartTime = findNextEventStartTime(eventsData);
        const monthFragment = document.createDocumentFragment();
        
        for (const [monthKey, month] of Object.entries(eventsData.months)) {
            const monthSection = createMonthSection(month, nextEventStartTime);
            monthFragment.appendChild(monthSection);
        }
        eventsContainer.appendChild(monthFragment);
        syncNavigationTargets();

        // 在页面加载时检查
        const returnFrom = sessionStorage.getItem(RETURN_FROM_KEY);
        const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
        
        if (returnFrom && savedPosition) {
            setTimeout(() => {
                const targetPosition = parseInt(savedPosition);
                scrollWindowTo(targetPosition);
                
                // 清理存储
                sessionStorage.removeItem(SCROLL_POSITION_KEY);
                sessionStorage.removeItem(RETURN_FROM_KEY);
            }, 100);
        }

        // 更新导航激活状态
        if (hash) {
            updateNavActiveState(hash);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

function createMonthSection(month, nextEventStartTime) {
    const section = templates.monthSection.content.cloneNode(true).querySelector('.month-section');
    const title = section.querySelector('.month-title');
    const grid = section.querySelector('.events-grid');
    const eventsByDate = groupEventsByStructure(month.events);
    
    title.textContent = month.title;
    
    // 按日期顺序创建日期区块
    const dateFragment = document.createDocumentFragment();
    Object.keys(eventsByDate).sort((a, b) => {
        const dateA = new Date(eventsByDate[a].date);
        const dateB = new Date(eventsByDate[b].date);
        return dateA - dateB;
    }).forEach(dateKey => {
        const dateGroup = eventsByDate[dateKey];
        const dateSection = createDateSection(dateKey, dateGroup, nextEventStartTime);
        dateFragment.appendChild(dateSection);
    });
    grid.appendChild(dateFragment);
    
    return section;
}

function groupEventsByStructure(events) {
    const structure = {};
    const processedEvents = new Set();
    
    events.forEach(event => {
        // 根据是否重赛选择开始日期
        const startDate = event.dateRange.isRescheduled && event.dateRange.Restart
            ? new Date(event.dateRange.Restart)
            : new Date(event.dateRange.start);
        
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const dateKey = `${month}.${day}`;
        
        if (!structure[dateKey]) {
            structure[dateKey] = {
                date: event.dateRange.isRescheduled && event.dateRange.Restart 
                    ? event.dateRange.Restart 
                    : event.dateRange.start,
                phases: {}
            };
        }
        
        event.matches.forEach(match => {
            // 使用重赛日期或原始日期创建唯一标识
            const eventId = `${
                event.dateRange.isRescheduled && event.dateRange.Restart 
                    ? event.dateRange.Restart 
                    : event.dateRange.start
            }-${match.title}`;
            
            if (processedEvents.has(eventId)) return;
            processedEvents.add(eventId);
            
            const phase = match.phase;
            if (!structure[dateKey].phases[phase]) {
                structure[dateKey].phases[phase] = {
                    groups: {}
                };
            }
            
            // 生成 phaseId
            let phaseId = '';
            if (match.title.includes('恒星组提名')) {
                phaseId = 'stellar-nomination';
            } else if (match.title.includes('新星组') && match.title.includes('提名')) {
                phaseId = 'nova-nomination';
            } else if (match.title.includes('预选赛')) {
                const round = match.title.match(/第([一二三四五六])轮/)?.[1];
                if (round) {
                    const numMap = {
                        '一': '1-1', 
                        '二': '1-2', 
                        '三': '2-1', 
                        '四': '2-2', 
                        '五': '3-1', 
                        '六': '3-2'
                    };
                    phaseId = `preliminary-${numMap[round]}`;
                }
            }

            // 保留原有的分组逻辑
            let mainGroup;
            if (match.title.includes('预选赛')) {
                const roundMatch = match.title.match(/第([一二三四五六])轮/);
                if (roundMatch) {
                    mainGroup = `预选赛${roundMatch[0]}`;
                } else {
                    mainGroup = match.title;
                }
            } else {
                mainGroup = match.title.includes('恒星组') ? '恒星组提名' : 
                          match.title.includes('新星组') ? '新星组提名' : '其他';
            }
            
            if (!structure[dateKey].phases[phase].groups[mainGroup]) {
                structure[dateKey].phases[phase].groups[mainGroup] = [];
            }
            
            structure[dateKey].phases[phase].groups[mainGroup].push({
                event,
                match,
                phaseId 
            });
        });
    });
    
    return structure;
}

function createDateSection(date, dateGroup, nextEventStartTime) {
    const dateSection = templates.dateSection.content.cloneNode(true).querySelector('.date-section');
    const dateHeader = dateSection.querySelector('.date-header');
    
    dateHeader.textContent = date;
    
    const phaseFragment = document.createDocumentFragment();
    Object.entries(dateGroup.phases).forEach(([phaseName, phase]) => {
        const phaseSection = createPhaseSection(phaseName, phase, nextEventStartTime);
        phaseFragment.appendChild(phaseSection);
    });
    dateSection.appendChild(phaseFragment);
    
    return dateSection;
}

function createPhaseSection(phaseName, phase, nextEventStartTime) {
    const phaseSection = templates.phaseSection.content.cloneNode(true).querySelector('.phase-group');
    const phaseHeader = phaseSection.querySelector('.phase-header');
    const phaseContent = phaseSection.querySelector('.phase-content');
    
    const firstMatch = Object.values(phase.groups)[0]?.[0];
    if (firstMatch?.phaseId) {
        phaseSection.dataset.phase = firstMatch.phaseId;
    }
    
    phaseSection.id = phaseName;
    observer.observe(phaseSection);
    phaseHeader.textContent = phaseName;
    
    const groupFragment = document.createDocumentFragment();
    Object.entries(phase.groups).forEach(([groupName, matches]) => {
        const finalGroupTitle = 
            TITLE_MAPPING[groupName]?.groupTitle || groupName;
        
        const modifiedMatches = matches.flatMap((eventMatch) => {
            const match = eventMatch.match;
            
            if (TITLE_MAPPING[match.title]) {
                return TITLE_MAPPING[match.title].map(item => ({
                    ...eventMatch,
                    match: {
                        ...match,
                        title: item.title,
                        format: item.format,
                        details: {
                            ...match.details,
                            qualified: {
                                description: item.description
                            }
                        }
                    }
                }));
            }
            
            return [eventMatch];
        });
        
        const groupSection = createGroupSection(finalGroupTitle, modifiedMatches, nextEventStartTime);
        groupFragment.appendChild(groupSection);
    });
    phaseContent.appendChild(groupFragment);
    
    phaseHeader.addEventListener('click', () => {
        phaseSection.classList.toggle('collapsed');
    });
    
    return phaseSection;
}

function createDateContent(event) {
    const fragment = document.createDocumentFragment();
    if (event.dateRange.isRescheduled) {
        fragment.appendChild(document.createTextNode(`原定：${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
        fragment.appendChild(document.createElement('br'));
        fragment.appendChild(document.createTextNode(`重赛：${formatDateTime(event.dateRange.Restart)} - ${formatDateTime(event.dateRange.Reend)}`));
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-trigger';
        tooltip.textContent = '?';
        tooltip.dataset.title = event.dateRange.rescheduledReason;
        fragment.appendChild(document.createTextNode(' '));
        fragment.appendChild(tooltip);
    } else {
        fragment.appendChild(document.createTextNode(`${formatDateTime(event.dateRange.start)} - ${formatDateTime(event.dateRange.end)}`));
    }
    if (event.dateRange.result) {
        fragment.appendChild(document.createTextNode(` | 结果公布：${formatDateTime(event.dateRange.result, 'date')}`));
    }
    return fragment;
}

function createStatusInfo(status, stats) {
    const fragment = document.createDocumentFragment();
    if (status === 'postponed') {
        const wrapper = document.createElement('div');
        wrapper.className = 'status-wrapper';
        const statusLabel = document.createElement('span');
        statusLabel.className = 'event-status status-postponed';
        statusLabel.textContent = '已延期';
        const hint = document.createElement('div');
        hint.className = 'postpone-hint';
        const icon = document.createElement('i');
        icon.className = 'fas fa-question-circle';
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = '该赛事已延期，具体时间待定';
        hint.appendChild(icon);
        hint.appendChild(tooltip);
        wrapper.appendChild(statusLabel);
        wrapper.appendChild(hint);
        fragment.appendChild(wrapper);
    } else {
        const statusNode = document.createElement('span');
        statusNode.className = `event-status status-${status}`;
        statusNode.textContent = getStatusText(status);
        fragment.appendChild(statusNode);
    }
    if (stats) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'event-stats';
        const item = document.createElement('span');
        item.className = 'stat-item';
        item.textContent = `总选票数: ${stats.votes.total}（有效：${stats.votes.valid}）`;
        statsContainer.appendChild(item);
        fragment.appendChild(statsContainer);
    }
    return fragment;
}

function createGroupSection(groupTitle, groupData, nextEventStartTime) {
    const section = templates.groupSection.content.cloneNode(true).querySelector('.group-section');
    const titleEl = section.querySelector('.group-title');
    const dateEl = section.querySelector('.group-date');
    const statusInfo = section.querySelector('.status-info');
    const cardsContainer = section.querySelector('.cards-container');
    
    const firstEvent = groupData[0].event;
    const stats = firstEvent?.stats;
    const status = getEventStatus(firstEvent, nextEventStartTime);

    titleEl.textContent = groupTitle;
    dateEl.replaceChildren(createDateContent(firstEvent));
    statusInfo.replaceChildren(createStatusInfo(status, stats));

    cardsContainer.hidden = status !== 'completed';
    const cardsFragment = document.createDocumentFragment();
    groupData.forEach(data => {
        cardsFragment.appendChild(createEventCard(data.event, data.match, nextEventStartTime));
    });
    cardsContainer.appendChild(cardsFragment);
    
    return section;
}

function formatDateTime(date, format = 'full') {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const d = new Date(date);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekDay = weekDays[d.getDay()];
    
    if (format === 'date') {
        return `${year}-${month}-${day} (${weekDay})`;
    }
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (${weekDay})`;
}

function formatEventTitle(title) {  
    // 只处理预选赛的标题
    if (title.includes('预选赛')) {
        if (title.includes('恒星组')) {
            return '恒星组';
        } else if (title.includes('新星组')) {
            return '新星组';
        }
    }
    return title;
}

function getStatusText(status) {
    const statusMap = {
        'completed': '已结束',
        'ongoing': '进行中',
        'upcoming': '即将开始',
        'notstarted': '未开始',
        'postponed': '已延期'  
    };
    return statusMap[status] || status;
}

function toChineseNumber(num) {
    const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseNumbers[num];
}

// 更新导航激活状态
function updateNavActiveState(activeId) {
    // 先移除所有项的激活状态
    nav.querySelectorAll('.elevator-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 先折叠所有组
    nav.querySelectorAll('.elevator-nav-group').forEach(group => {
        group.classList.add('collapsed');
        const icon = group.querySelector('.collapse-icon');
        if (icon) {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        }
    });
    
    // 激活当前项并展开其所在组
    const activeItem = nav.querySelector(`.elevator-nav-item[data-target="${activeId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        
        // 展开当前项所在的组
        const group = activeItem.closest('.elevator-nav-group');
        if (group) {
            group.classList.remove('collapsed');
            const icon = group.querySelector('.collapse-icon');
            if (icon) {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
        }
    }
}

// 滚动监听
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
        const scrollPosition = window.scrollY + 100;
        
        // 找到当前可见的阶段
        const phases = document.querySelectorAll('[data-phase]');
        let currentPhase = null;
        let minDistance = Infinity;
        
        phases.forEach(phase => {
            const rect = phase.getBoundingClientRect();
            const distance = Math.abs(rect.top - 100);
            
            if (distance < minDistance) {
                minDistance = distance;
                currentPhase = phase.dataset.phase;
            }
        });
        
        // 更新导航栏状态
        if (currentPhase) {
            updateNavActiveState(resolveNavigationTargetId(currentPhase));
        }
    }, 100); // 100ms 的防抖
});

// 页面加载时检查 hash 并滚动
window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const targetElement = resolvePhaseTarget(hash);
        if (targetElement) {
            setTimeout(() => {
                scrollWindowTo(targetElement.offsetTop - 80);
                updateNavActiveState(resolveNavigationTargetId(targetElement.dataset.phase));
            }, 100);
        }
    }
});


