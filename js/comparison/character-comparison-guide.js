import { calculateAverage, calculateBase, calculateOneToOne } from './character/calculation/CharacterComparisonCalculator.js';
import {
    calculateGroupAverage,
    calculateGroupBaseAverage,
    calculateGroupBaseTotal,
    calculateGroupTotal
} from './character/calculation/GroupComparisonCalculator.js';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化代码高亮
    hljs.highlightAll();
    
    const sections = document.querySelectorAll('.type-section');
    const navItems = document.querySelectorAll('.nav-item');
    const guideContent = document.querySelector('.guide-content');
    
    // 自定义平滑滚动函数
    function smoothScroll(element, target, duration = 500) {
        const start = element.scrollTop;
        const distance = target - start;
        const startTime = performance.now();
        
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        
        function animation(currentTime) {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            element.scrollTop = start + (distance * easeOutCubic(progress));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    // 滚动监听
    const observerOptions = {
        root: guideContent,  // 监听 guide-content 的滚动
        rootMargin: '-20% 0px -60% 0px',  // 调整触发区域
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 移除所有 active 类
                navItems.forEach(item => item.classList.remove('active'));
                // 给当前 section 对应的导航项添加 active 类
                const targetNav = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
                if (targetNav) {
                    targetNav.classList.add('active');
                    // 使用自定义滚动让导航项滚动到可见区域
                    const navContainer = targetNav.parentElement;
                    const targetPosition = targetNav.offsetTop - navContainer.offsetHeight / 2 + targetNav.offsetHeight / 2;
                    smoothScroll(navContainer, targetPosition, 300);
                }
            }
        });
    }, observerOptions);
    
    sections.forEach(section => observer.observe(section));
    
    // 平滑滚动
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const targetPosition = targetSection.offsetTop - guideContent.offsetTop;
                smoothScroll(guideContent, targetPosition);
                history.pushState(null, '', targetId);
            }
        });
    });
    
    // 处理页面加载时的锚点定位
    if (location.hash) {
        const targetSection = document.querySelector(location.hash);
        if (targetSection) {
            setTimeout(() => {
                const targetPosition = targetSection.offsetTop - guideContent.offsetTop;
                smoothScroll(guideContent, targetPosition);
            }, 100);
        }
    }

    // 代码面板折叠功能
    const codePanel = document.querySelector('.code-panel');
    const togglePanelBtn = document.querySelector('.toggle-panel');
    
    togglePanelBtn.addEventListener('click', () => {
        codePanel.classList.toggle('collapsed');
        // 更新按钮图标方向
        const icon = togglePanelBtn.querySelector('i');
        if (codePanel.classList.contains('collapsed')) {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        } else {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        }
    });
    

    // Tab 切换功能
    const tabItems = document.querySelectorAll('.tab-item');
    const codeSections = document.querySelectorAll('.code-section');

    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有激活状态
            tabItems.forEach(item => item.classList.remove('active'));
            codeSections.forEach(section => section.classList.remove('active'));
            
            // 添加当前激活状态
            tab.classList.add('active');
            const type = tab.dataset.type;
            const targetSection = document.querySelector(`.code-section[data-type="${type}"]`);
            
            // 检查目标区域是否存在
            if (!targetSection) {
                console.warn(`No code section found for type: ${type}`);
                return;
            }
            
            targetSection.classList.add('active');
            
            // 更新代码示例
            updateCodeExample(type);
            
            // 重新初始化展开按钮
            setTimeout(initCodeExpand, 0);
        });
    });

    // 初始化代码块展开/收起功能
    function cloneTemplate(templateId) {
        const template = document.getElementById(templateId);
        if (!template) {
            throw new Error(`找不到代码指南模板: ${templateId}`);
        }
        return template.content.firstElementChild.cloneNode(true);
    }

    function initCodeExpand() {
        const codePanel = document.querySelector('.code-panel');
        if (!codePanel) return;
        
        // 先移除已存在的按钮
        const existingBtn = document.querySelector('.code-expand');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // 创建一个容器来包裹按钮
        const buttonContainer = cloneTemplate('code-expand-template');

        
        // 创建"查看全部"按钮
        const expandBtn = buttonContainer.querySelector('.code-expand');


        
        // 将按钮添加到容器中，再将容器添加到代码面板中

        codePanel.appendChild(buttonContainer);
        
        // 点击事件
        expandBtn.addEventListener('click', () => {
            // 获取当前激活的代码区域
            const activeSection = document.querySelector('.code-section.active');
            if (!activeSection) return;
            
            const modal = cloneTemplate('code-modal-template');

            document.body.appendChild(modal);
            
            // 获取当前代码块的内容
            const currentCode = CODE_EXAMPLES[activeSection.dataset.type];
            const modalCode = modal.querySelector('code');
            
            // 先高亮代码
            const tempCode = cloneTemplate('highlight-code-template');
            tempCode.className = 'language-javascript';
            tempCode.textContent = currentCode;
            hljs.highlightElement(tempCode);
            
            // 获取高亮后的HTML并按行分割
            const highlightedLines = tempCode.innerHTML.split('\n');
            
            // 逐行添加代码
            highlightedLines.forEach((line, index) => {
                const lineDiv = cloneTemplate('code-line-template');
                lineDiv.className = 'code-line';
                lineDiv.setAttribute('data-line-number', index + 1);  // 添加行号
                lineDiv.innerHTML = line || '&nbsp;';  // 处理空行
                modalCode.appendChild(lineDiv);
            });
            
            // 触发显示动画
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
            
            // 关闭函数
            const closeModal = () => {
                modal.classList.add('hiding');
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            };
            
            // 关闭按钮
            modal.querySelector('.code-modal-close').onclick = closeModal;
            
            // 点击遮罩关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        });
    }

    const CODE_EXAMPLES = {
        'one-to-one': calculateOneToOne.toString(),
        base: calculateBase.toString(),
        avg: calculateAverage.toString(),
        'group-total': calculateGroupTotal.toString(),
        'group-avg': calculateGroupAverage.toString(),
        'group-base-total': calculateGroupBaseTotal.toString(),
        'group-base-avg': calculateGroupBaseAverage.toString()
    };

    // 初始化代码示例
    function initCodeExamples() {
        const activeSection = document.querySelector('.code-section.active');
        if (activeSection) {
            const type = activeSection.dataset.type;
            const code = activeSection.querySelector('code');
            if (code && CODE_EXAMPLES[type]) {
                // 移除已有的类和属性
                code.className = 'language-javascript';
                code.removeAttribute('data-highlighted');
                
                // 先清空代码内容
                code.innerHTML = '';
                
                // 先高亮代码
                const tempCode = cloneTemplate('highlight-code-template');
                tempCode.className = 'language-javascript';
                tempCode.textContent = CODE_EXAMPLES[type];
                hljs.highlightElement(tempCode);
                
                // 获取高亮后的HTML并按行分割
                const highlightedLines = tempCode.innerHTML.split('\n');
                
                // 逐行添加高亮后的代码，并为每行添加动画
                highlightedLines.forEach((line, index) => {
                    // 创建行容器
                    const lineDiv = cloneTemplate('code-line-template');
                    lineDiv.className = 'code-line';
                    lineDiv.style.opacity = '0';
                    lineDiv.style.transform = 'translateX(20px)';
                    lineDiv.style.transition = 'all 0.3s ease';
                    lineDiv.style.transitionDelay = `${index * 0.05}s`;
                    
                    // 添加高亮后的代码内容
                    lineDiv.innerHTML = line || '&nbsp;';  // 处理空行
                    
                    // 添加到代码块
                    code.appendChild(lineDiv);
                    
                    // 触发动画
                    setTimeout(() => {
                        lineDiv.style.opacity = '1';
                        lineDiv.style.transform = 'translateX(0)';
                    }, 50);
                });
            }
        }
    }

    // Tab 切换时更新代码
    function updateCodeExample(type) {
        const codeSection = document.querySelector(`.code-section[data-type="${type}"]`);
        if (codeSection && CODE_EXAMPLES[type]) {
            const code = codeSection.querySelector('code');
            
            // 移除已有的类和属性
            code.className = 'language-javascript';
            code.removeAttribute('data-highlighted');
            
            // 先清空代码内容
            code.innerHTML = '';
            
            // 获取代码文本并按行分割
            const codeLines = CODE_EXAMPLES[type].split('\n');
            
            // 先高亮代码
            const tempCode = cloneTemplate('highlight-code-template');
            tempCode.className = 'language-javascript';
            tempCode.textContent = CODE_EXAMPLES[type];
            hljs.highlightElement(tempCode);
            
            // 获取高亮后的HTML并按行分割
            const highlightedLines = tempCode.innerHTML.split('\n');
            
            // 逐行添加高亮后的代码，并为每行添加动画
            highlightedLines.forEach((line, index) => {
                // 创建行容器
                const lineDiv = cloneTemplate('code-line-template');
                lineDiv.className = 'code-line';
                lineDiv.style.opacity = '0';
                lineDiv.style.transform = 'translateX(20px)';
                lineDiv.style.transition = 'all 0.3s ease';
                lineDiv.style.transitionDelay = `${index * 0.05}s`;
                
                // 添加高亮后的代码内容
                lineDiv.innerHTML = line || '&nbsp;';  // 处理空行
                
                // 添加到代码块
                code.appendChild(lineDiv);
                
                // 触发动画
                setTimeout(() => {
                    lineDiv.style.opacity = '1';
                    lineDiv.style.transform = 'translateX(0)';
                }, 50);
            });
        }
    }

    // 修改初始化顺序
    initCodeExamples();   // 先加载代码示例
    initCodeExpand();     // 再初始化展开按钮
});