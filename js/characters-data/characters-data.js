import { CONFIG } from '../common/config.js';
import { SERIES_ALIASES } from '../aliases/aliases.js';
import { Router } from '../common/router.js';

const templates = {
    characterCard: document.getElementById('character-card-template'),
    rankGroup: document.getElementById('rank-group-template'),
    rankRound: document.getElementById('rank-round-template'),
    characterCards: document.getElementById('character-cards-template'),
    ipText: document.getElementById('ip-text-template'),
    customTooltip: document.getElementById('custom-tooltip-template'),
    novaGroup: document.getElementById('nova-group-template'),
    seasonGroup: document.getElementById('season-group-template')
};

function normalizeSeriesName(name) {
    for (const [originalName, aliases] of Object.entries(SERIES_ALIASES)) {
        if (aliases.includes(name)) {
            return originalName;
        }
    }
    return name;
}

let currentSearchResults = [];
let currentResultIndex = -1;  

let isEnterKeySwitch = false;  

let isCrossGenderSwitching = false;

const ipMap = new Map(); 

async function loadCharactersData() {
    try {
        const response = await fetch("data/characters/roundsData.json");
        const data = await response.json();
        renderCharacters(data);
    } catch (error) {
        console.error('加载角色数据失败:', error);
    }
}

function renderCharacters(data) {
    const stellarContainer = document.querySelector('.stellar .rank-groups');
    const novaContainer = document.querySelector('.nova .rank-groups');
    
    if (CONFIG.characters.showRounds) {
        document.body.classList.add('show-rounds-mode');
    } else {
        document.body.classList.remove('show-rounds-mode');
    }
    
    renderStellarGroups(data.stellar, stellarContainer);
    renderNovaGroups(data.nova, novaContainer);
}

function renderStellarGroups(data, container) {
    const femaleGroup = templates.rankGroup.content.cloneNode(true).querySelector('.rank-group');
    femaleGroup.dataset.gender = 'female';
    femaleGroup.classList.add('show');
    renderStellarGender(data.female, femaleGroup, 'female');
    container.appendChild(femaleGroup);
    
    const maleGroup = templates.rankGroup.content.cloneNode(true).querySelector('.rank-group');
    maleGroup.dataset.gender = 'male';
    maleGroup.style.display = 'none';
    renderStellarGender(data.male, maleGroup, 'male');
    container.appendChild(maleGroup);
    
    const genderTabs = container.closest('.group-container').querySelectorAll('.gender-tabs .tab-btn');
    genderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            
            genderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const gender = tab.dataset.gender;
            const showGroup = container.querySelector(`.rank-group[data-gender="${gender}"]`);
            const hideGroup = container.querySelector(`.rank-group[data-gender="${gender === 'female' ? 'male' : 'female'}"]`);
            
            if (isEnterKeySwitch) {
                hideGroup.style.display = 'none';
                hideGroup.classList.remove('show');
                showGroup.style.display = '';
                showGroup.classList.add('show');
                showGroup.querySelectorAll('.character-card').forEach(card => {
                    card.classList.add('show');
                });
                isEnterKeySwitch = false;
            } else {
                const cards = showGroup.querySelectorAll('.character-card');
                cards.forEach(card => card.classList.remove('show'));
                
                hideGroup.classList.remove('show');
                
                setTimeout(() => {
                    hideGroup.style.display = 'none';
                    showGroup.style.display = '';
                    
                    requestAnimationFrame(() => {
                        showGroup.classList.add('show');
                        
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                card.classList.add('show');
                            }, index * 20);
                        });
                    });
                }, 300);
            }
        });
    });
}

function renderStellarGender(groups, container, gender) {
    if (CONFIG.characters.showRounds) {
        groups.forEach(group => {
            const roundDiv = templates.rankRound.content.cloneNode(true).querySelector('.rank-round');
            const titleDiv = roundDiv.querySelector('.rank-title');
            const cardsDiv = roundDiv.querySelector('.character-cards');

            titleDiv.textContent = group.rankLabel;
            const rank = parseInt(group.rankLabel);
            titleDiv.dataset.rank = rank;
            
            group.characters.forEach(char => {
                const card = createCharacterCard(char, gender);
                if (gender === 'female') {
                    card.classList.add('show');
                }
                cardsDiv.appendChild(card);
            });
            
            container.appendChild(roundDiv);
        });
    } else {
        const groupDiv = templates.rankGroup.content.cloneNode(true).querySelector('.rank-group');
        groupDiv.dataset.gender = gender;
        
        if (gender === 'female') {
            groupDiv.classList.add('show');
        }
        
        const cardsDiv = templates.characterCards.content.cloneNode(true).querySelector('.character-cards');
        cardsDiv.dataset.gender = gender;
        
        // 获取所有角色并排序
        const allCharacters = groups.flatMap(group => group.characters);
        
        // 自定义排序函数
        const customSort = (a, b) => {
            const idA = parseInt(a.id.replace('SF', ''));
            const idB = parseInt(b.id.replace('SF', ''));
            
            // SF001-SF037 排在最前面
            if (idA <= 37 && idB <= 37) {
                return idA - idB;  // 正常升序
            }
            if (idA <= 37) return -1;  // a 排在前面
            if (idB <= 37) return 1;   // b 排在前面
            
            // SF129-SF038 倒序排列
            return idB - idA;
        };
        
        // 应用排序
        const sortedCharacters = allCharacters.sort(customSort);
        
        // 渲染排序后的角色
        sortedCharacters.forEach(char => {
            const card = createCharacterCard(char, gender);
            cardsDiv.appendChild(card);
        });
        
        groupDiv.appendChild(cardsDiv);
        container.appendChild(groupDiv);
        
        // 添加初始动画
        requestAnimationFrame(() => {
            groupDiv.classList.add('show');
            const cards = cardsDiv.querySelectorAll('.character-card');
            cards.forEach(card => card.classList.add('show'));
        });
    }
}

function createCharacterCard(char, gender) {
    const card = templates.characterCard.content.cloneNode(true).querySelector('.character-card');
    card.dataset.gender = gender;
    card.dataset.id = char.id;
    card.dataset.ip = char.ip;
    
    let sameIpCards = ipMap.get(char.ip);
    if (!sameIpCards) {
        sameIpCards = new Set();
        ipMap.set(char.ip, sameIpCards);
    }
    sameIpCards.add(card);
    
    if (char.avatar) {
        const img = card.querySelector('img');
        img.src = char.avatar;
        img.alt = char.name;
    }
    
    const name = card.querySelector('.character-name');
    name.textContent = char.name;
    
    const ip = card.querySelector('.character-ip');
    
    const ipText = templates.ipText.content.cloneNode(true).querySelector('.ip-text');
    ipText.textContent = char.ip;
    ip.appendChild(ipText);

    const tooltip = templates.customTooltip.content.cloneNode(true).querySelector('.custom-tooltip');
    tooltip.textContent = char.ip;
    ip.appendChild(tooltip);
    
    const cv = card.querySelector('.character-cv');
    cv.textContent = char.cv;
    
    card.addEventListener('click', () => {
        Router.navigateToCharacter(char.id);
    });
    
    card.addEventListener('mouseenter', () => {
        sameIpCards.forEach(card => {
            card.classList.add('same-ip');
        });
    });
    
    card.addEventListener('mouseleave', () => {
        sameIpCards.forEach(card => {
            card.classList.remove('same-ip');
        });
    });
    
    return card;
}

function checkTooltips() {
    document.querySelectorAll('.character-ip').forEach(ip => {
        const ipText = ip.querySelector('.ip-text');
        const tooltip = ip.querySelector('.custom-tooltip');
        
        if (ipText && tooltip && ipText.scrollWidth <= ipText.clientWidth) {
            tooltip.remove();
        }
    });
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    loadCharactersData();
    initializeSearch();
    initElevatorNav();
});

// 添加正则表达式验证函数
function isValidRegex(pattern) {
    try {
        new RegExp(pattern);
        return true;
    } catch (e) {
        return false;
    }
}

// 添加别名匹配函数
function matchSeriesAlias(series, keyword, useRegex, exactMatch) {
    const normalizedSeries = normalizeSeriesName(series);
    if (useRegex) {
        try {
            const regexPattern = new RegExp(keyword, 'i');
            if (regexPattern.test(normalizedSeries)) return true;
            
            const aliases = SERIES_ALIASES[normalizedSeries];
            return aliases ? aliases.some(alias => regexPattern.test(alias)) : false;
        } catch (e) {
            console.error('正则表达式错误:', e);
            return false;
        }
    }
    
    if (exactMatch) {
        if (normalizedSeries.toLowerCase() === keyword.toLowerCase()) return true;
        const aliases = SERIES_ALIASES[normalizedSeries];
        return aliases ? aliases.some(alias => 
            alias.toLowerCase() === keyword.toLowerCase()
        ) : false;
    }
    
    // 普通搜索
    if (normalizedSeries.toLowerCase().includes(keyword.toLowerCase())) return true;
    const aliases = SERIES_ALIASES[normalizedSeries];
    return aliases ? aliases.some(alias => 
        alias.toLowerCase().includes(keyword.toLowerCase())
    ) : false;
}

// 修改搜索处理函数
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim();
    const useRegex = document.getElementById('useRegex').checked;
    const exactMatch = document.getElementById('exactMatch').checked;
    
    // 重置搜索结果
    currentSearchResults = [];
    currentResultIndex = -1;
    clearHighlight();

    // 如果搜索框为空，直接返回
    if (!keyword) {
        updateSearchCount();
        return;
    }

    // 如果启用了正则表达式搜索，先验证语法
    if (useRegex && keyword) {
        if (!isValidRegex(keyword)) {
            // 显示错误提示
            const tooltip = templates.regexErrorTooltip.content.cloneNode(true).querySelector('.regex-error-tooltip');
            tooltip.textContent = '正则表达式语法错误';
            
            // 定位到搜索框旁边
            const searchBox = searchInput.getBoundingClientRect();
            tooltip.style.top = `${searchBox.top - 30}px`;
            tooltip.style.left = `${searchBox.left}px`;
            
            document.body.appendChild(tooltip);
            
            // 3秒后自动消失
            setTimeout(() => {
                tooltip.classList.add('fade-out');
                setTimeout(() => tooltip.remove(), 300);
            }, 3000);
            
            return;
        }
    }
    
    try {
        const keywords = exactMatch ? [keyword.toLowerCase()] :
            useRegex ? [keyword] :
            keyword.toLowerCase().split(/[,，\s]+/).filter(k => k);
        
        // 获取当前性别和另一个性别的卡片
        const currentGender = document.querySelector('.tab-btn.active').dataset.gender;
        const crossGender = document.getElementById('crossGender').checked;
        
        // 根据是否全局搜索选择卡片范围
        const cards = crossGender ?
            document.querySelectorAll('.character-card') :
            CONFIG.characters.showRounds ?
                document.querySelectorAll(`.rank-group[data-gender="${currentGender}"] .rank-round .character-card`) :
                document.querySelectorAll(`.character-cards[data-gender="${currentGender}"] .character-card`);
        
        currentSearchResults = [];  // 重置搜索结果
        
        cards.forEach(card => {
            const cardInfo = {
                name: card.querySelector('.character-name').textContent,
                ip: card.querySelector('.character-ip').textContent,
                cv: card.querySelector('.character-cv').textContent
            };
            
            const matched = keywords.some(kw => {
                return ['name', 'cv'].some(field => {
                    const value = cardInfo[field];
                    if (!value) return false;
                    return useRegex ? 
                        new RegExp(kw, 'i').test(value) :
                        exactMatch ?
                            value.toLowerCase() === kw :
                            value.toLowerCase().includes(kw);
                }) || matchSeriesAlias(cardInfo.ip, kw, useRegex, exactMatch);
            });
            
            if (matched) {
                card.classList.add('highlight');
                currentSearchResults.push(card);
            } else {
                card.classList.remove('highlight');
            }
        });
        
        // 如果有结果，高亮第一个
        if (currentSearchResults.length > 0) {
            currentResultIndex = 0;
            highlightCurrentResult();
        }
        
        updateSearchCount();
    } catch (e) {
        console.error('搜索出错:', e);
    }
}

// 切换到下一个结果
function switchToNextResult() {
    if (currentSearchResults.length === 0) return;
    
    const nextIndex = currentResultIndex === -1 ? 0 : 
                     currentResultIndex < currentSearchResults.length - 1 ? currentResultIndex + 1 : 0;
    
    const targetResult = currentSearchResults[nextIndex];
    const targetGender = targetResult.dataset.gender;
    const targetGroup = targetResult.closest('.group-container');
    const currentGender = targetGroup.querySelector('.tab-btn.active')?.dataset.gender;

    currentResultIndex = nextIndex;

    if (targetGender !== currentGender) {
        isEnterKeySwitch = true;
        isCrossGenderSwitching = true;

        const tabToSwitch = targetGroup.querySelector(`.tab-btn[data-gender="${targetGender}"]`);
        if (tabToSwitch) {
            tabToSwitch.click();
        }

        setTimeout(() => {
            isCrossGenderSwitching = false;
        }, 350);
    }

    highlightCurrentResult();
    updateSearchCount();
}

// 更新搜索结果计数显示
function updateSearchCount() {
    const searchCount = document.querySelector('.search-count');
    if (!searchCount) return;

    const searchInput = document.getElementById('searchInput');
    
    // 如果搜索框为空，隐藏计数器
    if (!searchInput.value.trim()) {
        searchCount.style.display = 'none';
        return;
    }
    
    // 如果没有搜索结果，显示 0/0 并添加红色样式
    if (currentSearchResults.length === 0) {
        searchCount.textContent = '0/0';
        searchCount.classList.add('no-results');
    } else {
        searchCount.textContent = `${currentResultIndex + 1}/${currentSearchResults.length}`;
        searchCount.classList.remove('no-results');
    }
    
    // 显示计数器
    searchCount.style.display = 'block';
}

// 修改清除高亮函数
function clearHighlight() {
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('highlight', 'current-result');
    });
}

// 自定义平滑滚动函数
function smoothScrollTo(targetY, duration = 500) {
    const startY = window.scrollY;
    const difference = targetY - startY;
    const startTime = performance.now();
    
    function easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }
    
    function step() {
        const currentTime = performance.now() - startTime;
        const progress = Math.min(currentTime / duration, 1);
        
        window.scrollTo(0, startY + (difference * easeOutQuart(progress)));
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    
    requestAnimationFrame(step);
}

// 修改滚动到结果的函数
function scrollToResult(card) {
    // 等待标签页切换动画完成后再滚动
    setTimeout(() => {
        const cardRect = card.getBoundingClientRect();
        const targetY = window.scrollY + cardRect.top - (window.innerHeight / 2) + (cardRect.height / 2);
        
        smoothScrollTo(targetY);
    }, isEnterKeySwitch ? 300 : 0);
}

// 修改高亮当前结果的函数
function highlightCurrentResult() {
    // 先移除所有当前结果的高亮
    document.querySelectorAll('.character-card.current-result').forEach(card => {
        card.classList.remove('current-result');
    });
    
    if (currentSearchResults.length > 0) {
        const currentCard = currentSearchResults[currentResultIndex];
        currentCard.classList.add('current-result');
        
        scrollToResult(currentCard);
        updateSearchCount();
    }
}

// 初始化搜索功能
function initializeSearch() {
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('#searchBtn');
    const exactMatchCheckbox = document.querySelector('#exactMatch');
    
    // 添加搜索框事件
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey || currentSearchResults.length === 0) {
                // 按住Shift或没有搜索结果时，执行新搜索
                handleSearch();
            } else {
                // 否则切换到下一个结果
                switchToNextResult();
            }
        }
    });
    
    // 搜索按钮事件
    searchBtn.addEventListener('click', () => {
        handleSearch();
    });

    // 添加复选框互斥逻辑
    const useRegexCheckbox = document.getElementById('useRegex');
    
    exactMatchCheckbox.addEventListener('change', () => {
        if (exactMatchCheckbox.checked) {
            useRegexCheckbox.checked = false;
        }
        if (searchInput.value.trim()) {
            handleSearch();
        }
    });
    
    useRegexCheckbox.addEventListener('change', () => {
        if (useRegexCheckbox.checked) {
            exactMatchCheckbox.checked = false;
        }
        if (searchInput.value.trim()) {
            handleSearch();
        }
    });

    // 修改标签页切换的事件监听
    document.querySelectorAll('.gender-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const searchInput = document.querySelector('#searchInput');
            if (searchInput.value.trim() && !isCrossGenderSwitching) {
                // 只有在不是跨性别切换时才重新搜索
                setTimeout(() => {
                    handleSearch();
                }, 350);
            }
        });
    });

    // 添加输入事件监听，当输入框为空时清除高亮
    searchInput.addEventListener('input', () => {
        if (!searchInput.value.trim()) {
            handleSearch();  // 传入空字符串触发清除高亮
        }
    });
}

// 在切换性别标签时清理缓存
function clearIpCache() {
    ipMap.clear();
}

function renderNovaGroups(data, container) {
    const femaleGroup = templates.novaGroup.content.cloneNode(true).querySelector('.nova-group');
    femaleGroup.dataset.gender = 'female';
    femaleGroup.classList.add('show');
    renderNovaGender(data.female, femaleGroup, 'female');
    container.appendChild(femaleGroup);
    
    const maleGroup = templates.novaGroup.content.cloneNode(true).querySelector('.nova-group');
    maleGroup.dataset.gender = 'male';
    maleGroup.style.display = 'none';
    renderNovaGender(data.male, maleGroup, 'male');
    container.appendChild(maleGroup);
    
    // 处理性别标签切换
    const genderTabs = container.closest('.group-container').querySelectorAll('.gender-tabs .tab-btn');
    genderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            
            genderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const gender = tab.dataset.gender;
            const showGroup = container.querySelector(`.nova-group[data-gender="${gender}"]`);
            const hideGroup = container.querySelector(`.nova-group[data-gender="${gender === 'female' ? 'male' : 'female'}"]`);
            
            if (isEnterKeySwitch) {
                // 快速切换模式
                hideGroup.style.display = 'none';
                hideGroup.classList.remove('show');
                hideGroup.querySelectorAll('.season-group').forEach(season => {
                    season.classList.remove('show');
                });
                
                showGroup.style.display = '';
                showGroup.classList.add('show');
                // 显示所有季节组和卡片
                showGroup.querySelectorAll('.season-group').forEach(season => {
                    season.classList.add('show');
                });
                showGroup.querySelectorAll('.character-card').forEach(card => {
                    card.classList.add('show');
                });
                isEnterKeySwitch = false;
            } else {
                // 动画切换模式
                const seasons = showGroup.querySelectorAll('.season-group');
                const cards = showGroup.querySelectorAll('.character-card');
                
                seasons.forEach(season => season.classList.remove('show'));
                cards.forEach(card => card.classList.remove('show'));
                
                hideGroup.classList.remove('show');
                hideGroup.querySelectorAll('.season-group').forEach(season => {
                    season.classList.remove('show');
                });
                
                setTimeout(() => {
                    hideGroup.style.display = 'none';
                    showGroup.style.display = '';
                    
                    requestAnimationFrame(() => {
                        showGroup.classList.add('show');
                        
                        // 季节组依次显示
                        seasons.forEach((season, seasonIndex) => {
                            setTimeout(() => {
                                season.classList.add('show');
                                // 该季节下的卡片依次显示
                                const seasonCards = season.querySelectorAll('.character-card');
                                seasonCards.forEach((card, cardIndex) => {
                                    setTimeout(() => {
                                        card.classList.add('show');
                                    }, cardIndex * 20);
                                });
                            }, seasonIndex * 100);
                        });
                    });
                }, 300);
            }
        });
    });
}

function renderNovaGender(groups, container, gender) {
    if (!Array.isArray(groups)) {
        console.error('Nova groups data format error:', groups);
        return;
    }
    
    const groupDiv = templates.novaGroup.content.cloneNode(true).querySelector('.nova-group');
    groupDiv.dataset.gender = gender;
    
    if (gender === 'female') {
        groupDiv.classList.add('show');
    }
    
    groups.forEach(seasonGroup => {
        if (!seasonGroup.season || !Array.isArray(seasonGroup.characters)) {
            console.error('Invalid season group data:', seasonGroup);
            return;
        }
        
        if (seasonGroup.characters.length === 0) {
            return;
        }
        
        const seasonDiv = templates.seasonGroup.content.cloneNode(true).querySelector('.season-group');
        seasonDiv.dataset.season = seasonGroup.season;
        
        if (gender === 'female') {
            seasonDiv.classList.add('show');
        }
        
        const titleDiv = seasonDiv.querySelector('.season-title');
        const cardsDiv = seasonDiv.querySelector('.character-cards');
        const seasonName = {
            'spring': '春季',
            'summer': '夏季',
            'autumn': '秋季',
            'winter': '冬季'
        }[seasonGroup.season] || seasonGroup.season;
        titleDiv.textContent = seasonName;
        
        seasonGroup.characters.forEach(char => {
            const card = createCharacterCard(char, gender);
            if (gender === 'female') {
                card.classList.add('show');
            }
            cardsDiv.appendChild(card);
        });
        
        groupDiv.appendChild(seasonDiv);
    });
    
    container.appendChild(groupDiv);
    
    requestAnimationFrame(() => {
        groupDiv.classList.add('show');
        groupDiv.querySelectorAll('.season-group').forEach((seasonGroup, seasonIndex) => {
            if (gender === 'female') {
                setTimeout(() => {
                    seasonGroup.classList.add('show');
                }, seasonIndex * 100);
            }
            
            const cards = seasonGroup.querySelectorAll('.character-card');
            cards.forEach((card, cardIndex) => {
                setTimeout(() => {
                    card.classList.add('show');
                }, seasonIndex * 100 + cardIndex * 20);
            });
        });
        
        setTimeout(checkTooltips, 500);  
    });
}

// 电梯导航相关代码
function initElevatorNav() {
    const nav = document.querySelector('.elevator-nav');
    const navItems = nav.querySelectorAll('.elevator-nav-item');
    const novaGroup = nav.querySelector('.elevator-nav-item[data-target="nova"]');
    
    // 处理导航点击
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 如果是新星组，只处理折叠/展开，不进行跳转
            if (item.dataset.target === 'nova') {
                return;
            }
            
            // 移除所有激活状态
            navItems.forEach(i => i.classList.remove('active'));
            // 添加当前项的激活状态
            item.classList.add('active');
            
            // 滚动到目标位置
            const target = item.dataset.target;
            const season = item.dataset.season;
            let targetElement;
            
            if (season) {
                // 如果是季节项，找到对应的季节组
                targetElement = document.querySelector(`.season-group[data-season="${season}"]`);
            } else {
                // 否则找到对应的主要分组
                targetElement = document.querySelector(`.group-container.${target}`);
            }
            
            if (targetElement) {
                // 使用新的滚动函数
                scrollToElement(targetElement);
            }
        });
    });
    
    // 单独处理新星组的折叠/展开
    novaGroup.addEventListener('click', (e) => {
        // 阻止事件冒泡，避免触发导航点击事件
        e.stopPropagation();
        
        // 如果点击的是子项的区域，不处理折叠
        if (e.target.closest('.sub-item')) return;
        
        novaGroup.classList.toggle('collapsed');
    });
    
    // 监听滚动，更新激活状态
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateActiveNavItem();
                ticking = false;
            });
            ticking = true;
        }
    });
}

// 更新导航项激活状态
function updateActiveNavItem() {
    const nav = document.querySelector('.elevator-nav');
    const navItems = nav.querySelectorAll('.elevator-nav-item');
    const scrollPosition = window.scrollY + window.innerHeight / 3;
    
    let activeItem = null;
    
    navItems.forEach(item => {
        const target = item.dataset.target;
        const season = item.dataset.season;
        let targetElement;
        
        if (season) {
            targetElement = document.querySelector(`.season-group[data-season="${season}"]`);
        } else {
            targetElement = document.querySelector(`.group-container.${target}`);
        }
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const absoluteTop = window.scrollY + rect.top;
            
            if (scrollPosition >= absoluteTop) {
                activeItem = item;
            }
        }
    });
    
    // 更新激活状态
    navItems.forEach(item => item.classList.remove('active'));
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// 电梯导航滚动函数
function scrollToElement(targetElement, duration = 500) {
    const startY = window.scrollY;
    const targetY = window.scrollY + targetElement.getBoundingClientRect().top - 80;  
    const difference = targetY - startY;
    const startTime = performance.now();
    
    function easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }
    
    function step() {
        const currentTime = performance.now() - startTime;
        const progress = Math.min(currentTime / duration, 1);
        
        window.scrollTo(0, startY + (difference * easeOutQuart(progress)));
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    
    requestAnimationFrame(step);
}

