document.addEventListener('DOMContentLoaded', () => {
    // 鍒濆鍖栦唬鐮侀珮浜?
    hljs.highlightAll();
    
    const sections = document.querySelectorAll('.type-section');
    const navItems = document.querySelectorAll('.nav-item');
    const guideContent = document.querySelector('.guide-content');
    
    // 鑷畾涔夊钩婊戞粴鍔ㄥ嚱鏁?
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
    
    // 婊氬姩鐩戝惉
    const observerOptions = {
        root: guideContent,  // 鐩戝惉 guide-content 鐨勬粴鍔?
        rootMargin: '-20% 0px -60% 0px',  // 璋冩暣瑙﹀彂鍖哄煙
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 绉婚櫎鎵€鏈塧ctive绫?
                navItems.forEach(item => item.classList.remove('active'));
                // 缁欏綋鍓峴ection瀵瑰簲鐨勫鑸」娣诲姞active绫?
                const targetNav = document.querySelector(`.nav-item[href="#${entry.target.id}"]`);
                if (targetNav) {
                    targetNav.classList.add('active');
                    // 浣跨敤鑷畾涔夋粴鍔ㄨ瀵艰埅椤规粴鍔ㄥ埌鍙鍖哄煙
                    const navContainer = targetNav.parentElement;
                    const targetPosition = targetNav.offsetTop - navContainer.offsetHeight / 2 + targetNav.offsetHeight / 2;
                    smoothScroll(navContainer, targetPosition, 300);
                }
            }
        });
    }, observerOptions);
    
    sections.forEach(section => observer.observe(section));
    
    // 骞虫粦婊氬姩
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
    
    // 澶勭悊椤甸潰鍔犺浇鏃剁殑閿氱偣瀹氫綅
    if (location.hash) {
        const targetSection = document.querySelector(location.hash);
        if (targetSection) {
            setTimeout(() => {
                const targetPosition = targetSection.offsetTop - guideContent.offsetTop;
                smoothScroll(guideContent, targetPosition);
            }, 100);
        }
    }

    // 浠ｇ爜闈㈡澘鎶樺彔鍔熻兘
    const codePanel = document.querySelector('.code-panel');
    const togglePanelBtn = document.querySelector('.toggle-panel');
    
    togglePanelBtn.addEventListener('click', () => {
        codePanel.classList.toggle('collapsed');
        // 鏇存柊鎸夐挳鍥炬爣鏂瑰悜
        const icon = togglePanelBtn.querySelector('i');
        if (codePanel.classList.contains('collapsed')) {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        } else {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        }
    });
    

    // Tab 鍒囨崲鍔熻兘
    const tabItems = document.querySelectorAll('.tab-item');
    const codeSections = document.querySelectorAll('.code-section');

    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            // 绉婚櫎鎵€鏈夋縺娲荤姸鎬?
            tabItems.forEach(item => item.classList.remove('active'));
            codeSections.forEach(section => section.classList.remove('active'));
            
            // 娣诲姞褰撳墠婵€娲荤姸鎬?
            tab.classList.add('active');
            const type = tab.dataset.type;
            const targetSection = document.querySelector(`.code-section[data-type="${type}"]`);
            
            // 妫€鏌ョ洰鏍囧尯鍩熸槸鍚﹀瓨鍦?
            if (!targetSection) {
                console.warn(`No code section found for type: ${type}`);
                return;
            }
            
            targetSection.classList.add('active');
            
            // 鏇存柊浠ｇ爜绀轰緥
            updateCodeExample(type);
            
            // 閲嶆柊鍒濆鍖栧睍寮€鎸夐挳
            setTimeout(initCodeExpand, 0);
        });
    });

    // 鍒濆鍖栦唬鐮佸潡灞曞紑/鏀惰捣鍔熻兘
    function initCodeExpand() {
        const codePanel = document.querySelector('.code-panel');
        if (!codePanel) return;
        
        // 鍏堢Щ闄ゅ凡瀛樺湪鐨勬寜閽?
        const existingBtn = document.querySelector('.code-expand');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // 鍒涘缓涓€涓鍣ㄦ潵鍖呰９鎸夐挳
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'code-expand-container';
        
        // 鍒涘缓"鏌ョ湅鍏ㄩ儴"鎸夐挳
        const expandBtn = document.createElement('button');
        expandBtn.className = 'code-expand';
        expandBtn.textContent = '鏌ョ湅鍏ㄩ儴';
        
        // 灏嗘寜閽坊鍔犲埌瀹瑰櫒涓紝鍐嶅皢瀹瑰櫒娣诲姞鍒颁唬鐮侀潰鏉夸腑
        buttonContainer.appendChild(expandBtn);
        codePanel.appendChild(buttonContainer);
        
        // 鐐瑰嚮浜嬩欢
        expandBtn.addEventListener('click', () => {
            // 鑾峰彇褰撳墠婵€娲荤殑浠ｇ爜鍖哄煙
            const activeSection = document.querySelector('.code-section.active');
            if (!activeSection) return;
            
            const modal = document.createElement('div');
            modal.className = 'code-modal';
            modal.innerHTML = `
                <div class="code-modal-container">
                    <button class="code-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                    <pre><code class="language-javascript"></code></pre>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 鑾峰彇褰撳墠浠ｇ爜鍧楃殑鍐呭
            const currentCode = CODE_EXAMPLES[activeSection.dataset.type];
            const modalCode = modal.querySelector('code');
            
            // 鍏堥珮浜唬鐮?
            const tempCode = document.createElement('code');
            tempCode.className = 'language-javascript';
            tempCode.textContent = currentCode;
            hljs.highlightElement(tempCode);
            
            // 鑾峰彇楂樹寒鍚庣殑HTML骞舵寜琛屽垎鍓?
            const highlightedLines = tempCode.innerHTML.split('\n');
            
            // 閫愯娣诲姞浠ｇ爜
            highlightedLines.forEach((line, index) => {
                const lineDiv = document.createElement('div');
                lineDiv.className = 'code-line';
                lineDiv.setAttribute('data-line-number', index + 1);  // 娣诲姞琛屽彿
                lineDiv.innerHTML = line || '&nbsp;';  // 澶勭悊绌鸿
                modalCode.appendChild(lineDiv);
            });
            
            // 瑙﹀彂鏄剧ず鍔ㄧ敾
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
            
            // 鍏抽棴鍑芥暟
            const closeModal = () => {
                modal.classList.add('hiding');
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            };
            
            // 鍏抽棴鎸夐挳
            modal.querySelector('.code-modal-close').onclick = closeModal;
            
            // 鐐瑰嚮閬僵鍏抽棴
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        });
    }

    // 浠ｇ爜绀轰緥閰嶇疆
    const CODE_EXAMPLES = {
        'one-to-one': `// 涓€瀵逛竴瀵规瘮閫昏緫 - 璁＄畻涓や釜瑙掕壊涔嬮棿鐨勭エ鏁板樊寮傚拰寰楃エ鐜?
if (compareType === COMPARISON_TYPES.oneToOne) {
    // 1. 鏁版嵁缁撴瀯鍒濆鍖?
    // 鍒涘缓涓変釜Map鏉ュ瓨鍌ㄦ暟鎹?
    // votesMap: 瀛樺偍姣忎釜瑙掕壊鐨勭エ鏁?
    // ratesMap: 瀛樺偍姣忎釜瑙掕壊鐨勫緱绁ㄧ巼
    // diffMap: 瀛樺偍涓庢渶楂樼エ鏁扮殑宸窛
    const votesMap = new Map();
    const ratesMap = new Map();
    const diffMap = new Map();

    // 2. 杩囨护鍜屽垎绫?
    // 杩囨护鍑哄弬涓庢姇绁ㄧ殑瑙掕壊锛堟帓闄よ嚜鍔ㄦ檵绾х殑瑙掕壊锛屽叾votes鍊间负'-'锛?
    const normalChars = characters.filter(char => char.votes !== '-');
    // 鍒ゆ柇鏄惁鏈夊涓甯告姇绁ㄧ殑瑙掕壊
    const hasMultipleNormal = normalChars.length >= 2;

    // 3. 璁＄畻鍩哄噯鍊?
    // 鑾峰彇鏈€楂樼エ鏁颁綔涓哄熀鍑?
    // 濡傛灉鏈夊涓甯告姇绁ㄧ殑瑙掕壊锛屾壘鍑烘渶楂樼エ锛涘惁鍒欒涓?
    const maxVotes = hasMultipleNormal 
        ? Math.max(...normalChars.map(char => parseInt(char.votes))) 
        : 0;

    // 4. 璁＄畻姣忎釜瑙掕壊鐨勬暟鎹?
    characters.forEach(char => {
        if (char.votes === '-') {
            // 4.1 澶勭悊鑷姩鏅嬬骇瑙掕壊
            // 鎵€鏈夋暟鍊艰涓簄ull锛岃〃绀烘棤闇€鍙備笌瀵规瘮
            votesMap.set(char.name, null);    // 鏃犵エ鏁?
            ratesMap.set(char.name, null);    // 鏃犲緱绁ㄧ巼
            diffMap.set(char.name, null);     // 鏃犲樊璺?
        } else {
            // 4.2 澶勭悊姝ｅ父鎶曠エ瑙掕壊
            const vote = parseInt(char.votes);
            votesMap.set(char.name, vote);    // 璁板綍瀹為檯绁ㄦ暟
            
            // 璁＄畻寰楃エ鐜囷紝淇濈暀涓€浣嶅皬鏁?
            ratesMap.set(char.name, ((vote / totalVotes) * 100).toFixed(1));
            
            // 璁＄畻涓庢渶楂樼エ鐨勫樊璺?
            // 鍙湪鏈夊涓甯告姇绁ㄨ鑹叉椂璁＄畻宸窛
            diffMap.set(char.name, hasMultipleNormal ? maxVotes - vote : null);
        }
    });

    // 5. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - characters: 鎵€鏈夊弬涓庡姣旂殑瑙掕壊鏁扮粍
    // - votesMap: 瀛樺偍姣忎釜瑙掕壊绁ㄦ暟鐨凪ap
    // - ratesMap: 瀛樺偍姣忎釜瑙掕壊寰楃エ鐜囩殑Map
    // - hasMultipleNormal: 鏄惁鏈夊涓甯告姇绁ㄧ殑瑙掕壊锛堢敤浜庡喅瀹氭槸鍚︽樉绀哄樊璺濓級
    return this.generateOneToOneHTML(characters, votesMap, ratesMap, hasMultipleNormal);
}`,
        'base': `// 鍩哄噯瀵规瘮閫昏緫 - 璁＄畻鍏朵粬瑙掕壊涓庡熀鍑嗚鑹茬殑绁ㄦ暟鍜屽緱绁ㄧ巼宸紓
if (compareType === COMPARISON_TYPES.baseCompare) {
    // 1. 鏁版嵁鍑嗗
    // 鑾峰彇鍩哄噯瑙掕壊锛堢涓€涓鑹诧級鍜岄渶瑕佸姣旂殑瑙掕壊锛堝叾浣欒鑹诧級
    // 鍩哄噯瑙掕壊閫氬父鏄垜浠噸鐐瑰叧娉ㄧ殑瑙掕壊锛岀敤浜庝笌鍏朵粬瑙掕壊杩涜瀵规瘮
    const baseCharacter = characters[0];
    const compareCharacters = characters.slice(1);

    // 2. 璁＄畻姣忎釜瀵规瘮瑙掕壊涓庡熀鍑嗚鑹茬殑宸紓鏁版嵁
    const comparisons = compareCharacters.map(char => {
        // 2.1 鑾峰彇绁ㄦ暟
        // 灏嗗瓧绗︿覆绫诲瀷鐨勭エ鏁拌浆鎹负鏁板瓧
        const baseVotes = parseInt(baseCharacter.votes);
        const compareVotes = parseInt(char.votes);

        // 2.2 澶勭悊鏃犳晥绁ㄦ暟鐨勬儏鍐?
        // 褰撳熀鍑嗚鑹叉垨瀵规瘮瑙掕壊鏄嚜鍔ㄦ檵绾ф椂锛坴otes涓?-'锛夛紝
        // 鎴栬€呯エ鏁拌В鏋愬け璐ユ椂锛岃繑鍥為粯璁ゅ€?
        if (isNaN(baseVotes) || isNaN(compareVotes)) {
            return {
                voteDiff: 0,        // 绁ㄦ暟宸窛
                voteRate: 0,        // 鍩哄噯瑙掕壊寰楃エ鐜?
                compareRate: 0,      // 瀵规瘮瑙掕壊寰楃エ鐜?
                rateDiff: 0,        // 寰楃エ鐜囧樊璺?
                isLeading: false    // 鏄惁棰嗗厛
            };
        }
        
        // 2.3 璁＄畻瀵规瘮鏁版嵁
        return {
            voteDiff: baseVotes - compareVotes,     // 绁ㄦ暟宸窛锛堟鏁拌〃绀哄熀鍑嗚鑹查鍏堬級
            voteRate: ((baseVotes / totalVotes) * 100).toFixed(1),      // 鍩哄噯瑙掕壊寰楃エ鐜?
            compareRate: ((compareVotes / totalVotes) * 100).toFixed(1), // 瀵规瘮瑙掕壊寰楃エ鐜?
            rateDiff: ((baseVotes - compareVotes) / totalVotes * 100).toFixed(1), // 寰楃エ鐜囧樊璺?
            isLeading: baseVotes > compareVotes     // 鍩哄噯瑙掕壊鏄惁棰嗗厛浜庡姣旇鑹?
        };
    });
    
    // 3. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - baseCharacter: 鍩哄噯瑙掕壊瀵硅薄
    // - compareCharacters: 闇€瑕佽繘琛屽姣旂殑鍏朵粬瑙掕壊鏁扮粍
    // - comparisons: 姣忎釜瀵规瘮瑙掕壊涓庡熀鍑嗚鑹茬殑宸紓鏁版嵁鏁扮粍
    // - totalVotes: 鎬荤エ鏁帮紝鐢ㄤ簬璁＄畻寰楃エ鐜?
    return this.generateOneToManyHTML(baseCharacter, compareCharacters, comparisons, totalVotes);
}`,
        'avg': `// 骞冲潎鍊煎姣旈€昏緫 - 璁＄畻姣忎釜瑙掕壊涓庡钩鍧囩エ鏁扮殑宸紓
if (compareType === COMPARISON_TYPES.avgCompare) {
    // 1. 鏁版嵁鍑嗗
    // 杩囨护鍑哄弬涓庢甯告姇绁ㄧ殑瑙掕壊锛堟帓闄よ嚜鍔ㄦ檵绾х殑瑙掕壊锛屽叾votes鍊间负'-'锛?
    // 杩欎簺瑙掕壊鐨勭エ鏁板皢鐢ㄤ簬璁＄畻骞冲潎鍊?
    const normalCharacters = characters.filter(char => char.votes !== '-');
    
    // 2. 璁＄畻骞冲潎绁ㄦ暟
    // 鍏堝皢鎵€鏈夋甯歌鑹茬殑绁ㄦ暟杞崲涓烘暟瀛?
    const normalVotes = normalCharacters.map(char => parseInt(char.votes));
    // 璁＄畻骞冲潎绁ㄦ暟锛氭墍鏈夌エ鏁颁箣鍜岄櫎浠ヨ鑹叉暟閲忥紙涓嶅洓鑸嶄簲鍏ワ紝淇濈暀灏忔暟锛?
    const avgVotes = normalVotes.reduce((a, b) => a + b, 0) / normalVotes.length;

    // 3. 璁＄畻姣忎釜瑙掕壊涓庡钩鍧囧€肩殑宸紓
    const comparisons = characters.map(char => {
        // 3.1 澶勭悊鑷姩鏅嬬骇瑙掕壊
        if (char.votes === '-') {
            return {
                voteDiff: null,      // 涓庡钩鍧囧€肩殑绁ㄦ暟宸窛
                voteRate: null,      // 寰楃エ鐜?
                rateDiff: null,      // 涓庡钩鍧囧€肩殑寰楃エ鐜囧樊璺?
                isLeading: null,     // 鏄惁棰嗗厛浜庡钩鍧囧€?
                isAuto: true         // 鏍囪涓鸿嚜鍔ㄦ檵绾?
            };
        }

        const votes = parseInt(char.votes);

        // 3.2 澶勭悊鍙湁涓€涓甯告姇绁ㄨ鑹茬殑鐗规畩鎯呭喌
        // 姝ゆ椂鏃犳硶杩涜骞冲潎鍊煎姣旓紝鍙樉绀哄緱绁ㄧ巼
        if (normalCharacters.length === 1) {
            return {
                voteDiff: null,      // 鏃犳硶璁＄畻宸窛
                voteRate: ((votes / totalVotes) * 100).toFixed(1),  // 浠呮樉绀哄緱绁ㄧ巼
                rateDiff: null,      // 鏃犳硶璁＄畻鐜囧樊
                isLeading: null,     // 鏃犳硶鍒ゆ柇棰嗗厛
                isAuto: false        // 闈炶嚜鍔ㄦ檵绾?
            };
        }

        // 3.3 璁＄畻涓庡钩鍧囧€肩殑宸紓鏁版嵁
        return {
            voteDiff: Number((votes - avgVotes).toFixed(1)),     // 涓庡钩鍧囧€肩殑绁ㄦ暟宸窛锛屼繚鐣?浣嶅皬鏁?
            voteRate: ((votes / totalVotes) * 100).toFixed(1),   // 寰楃エ鐜囷紝淇濈暀1浣嶅皬鏁?
            rateDiff: ((votes - avgVotes) / totalVotes * 100).toFixed(1),  // 涓庡钩鍧囧€肩殑寰楃エ鐜囧樊璺?
            isLeading: votes > avgVotes,  // 鏄惁楂樹簬骞冲潎鍊?
            isAuto: false                 // 闈炶嚜鍔ㄦ檵绾?
        };
    });
    
    // 4. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - characters: 鎵€鏈夊弬涓庡姣旂殑瑙掕壊
    // - avgVotes: 璁＄畻鍑虹殑骞冲潎绁ㄦ暟
    // - comparisons: 姣忎釜瑙掕壊鐨勫姣旂粨鏋?
    // - totalVotes: 鎬荤エ鏁?
    // - allCharacters: 鎵€鏈夎鑹诧紙鍖呮嫭鏈弬涓庡姣旂殑锛?
    return this.generateAvgCompareHTML(characters, avgVotes, comparisons, totalVotes, allCharacters);
}`,
        'group-total': `// 缁勬€荤エ鏁板姣旈€昏緫
if (compareType === COMPARISON_TYPES.groupTotalCompare) {
    // 1. 鏁版嵁鍑嗗
    // 鍏堟妸瑙掕壊鎸夌粍鍒嗙被
    const groups = [];
    const comparison = document.querySelector(SELECTORS.characterComparison);
    const groupElements = comparison.querySelectorAll(SELECTORS.characterGroup);
    
    // 浠嶥OM涓幏鍙栫粍淇℃伅
    groupElements.forEach(groupElement => {
        const members = groupElement.querySelectorAll(SELECTORS.groupMember);
        const group = Array.from(members).map(member => {
            const name = member.querySelector(SELECTORS.characterAvatar).alt;
            const ip = member.querySelector(SELECTORS.characterAvatar).title.split('@')[1];
            return characters.find(char => char.name === name && char.ip === ip);
        });
        groups.push(group);
    });

    // 2. 璁＄畻绁ㄦ暟
    // 2.1 璁＄畻姣忕粍鐨勬€荤エ鏁?
    const groupTotals = groups.map(group => {
        return group.reduce((sum, char) => {
            return sum + (char.votes === '-' ? 0 : parseInt(char.votes));
        }, 0);
    });
    
    // 2.2 璁＄畻鎵€鏈夌粍鐨勬€荤エ鏁?
    const allGroupsTotal = groupTotals.reduce((a, b) => a + b, 0);
    
    // 3. 鎺掑簭澶勭悊
    // 3.1 鑾峰彇鎺掑簭鍚庣殑绱㈠紩
    const sortedIndices = groupTotals
        .map((total, index) => ({ total, index }))
        .sort((a, b) => b.total - a.total)
        .map(item => item.index);
    
    // 3.2 鎸夋€荤エ鏁版帓搴忕粍鍜岀エ鏁?
    const sortedGroups = sortedIndices.map(index => groups[index]);
    const sortedTotals = sortedIndices.map(index => groupTotals[index]);
    
    // 4. 璁＄畻缁勯棿宸紓鍜屽緱绁ㄧ巼
    const comparisons = sortedTotals.map((total, index) => {
        const nextTotal = sortedTotals[index + 1];
        return {
            total,                   // 缁勬€荤エ鏁?
            voteRate: ((total / allGroupsTotal) * 100).toFixed(1),  // 缁勫緱绁ㄧ巼
            diff: nextTotal !== undefined ? total - nextTotal : null,  // 涓庝笅涓€缁勭殑宸窛
            rank: index + 1          // 鎺掑悕
        };
    });
    
    // 5. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - sortedGroups: 鎸夋€荤エ鏁版帓搴忓悗鐨勭粍鏁扮粍锛屾瘡涓粍鍖呭惈澶氫釜瑙掕壊瀵硅薄
    //   [{name, votes, ip}, ...]
    // - comparisons: 姣忎釜缁勭殑瀵规瘮鏁版嵁鏁扮粍
    //   [{total, voteRate, diff, rank}, ...]
    // - totalVotes: 鎵€鏈夎鑹茬殑鎬荤エ鏁帮紙鍖呮嫭鏈垎缁勭殑锛?
    // - allGroupsTotal: 鎵€鏈夌粍鐨勬€荤エ鏁颁箣鍜?
    return this.generateGroupTotalHTML(sortedGroups, comparisons, totalVotes, allGroupsTotal);
}`,
        'group-avg': `// 缁勫钩鍧囧€煎姣旈€昏緫
if (compareType === COMPARISON_TYPES.groupAvgCompare) {
    // 1. 鏁版嵁鍑嗗
    const groups = [];
    const comparison = document.querySelector(SELECTORS.characterComparison);
    const groupElements = comparison.querySelectorAll(SELECTORS.characterGroup);
    
    // 鏀堕泦姣忕粍鐨勮鑹?
    groupElements.forEach(groupElement => {
        const members = groupElement.querySelectorAll(SELECTORS.groupMember);
        const group = Array.from(members).map(member => {
            const name = member.querySelector(SELECTORS.characterAvatar).alt;
            const ip = member.querySelector(SELECTORS.characterAvatar).title.split('@')[1];
            return characters.find(char => char.name === name && char.ip === ip);
        });
        groups.push(group);
    });

    // 2. 璁＄畻骞冲潎鍊?
    // 2.1 璁＄畻姣忕粍鐨勫钩鍧囩エ鏁?
    const groupAverages = groups.map(group => {
        const validVotes = group.filter(char => char.votes !== '-');
        if (validVotes.length === 0) return 0;
        
        const total = validVotes.reduce((sum, char) => sum + parseInt(char.votes), 0);
        return total / validVotes.length;
    });
    
    // 2.2 璁＄畻鎵€鏈夌粍鐨勬€诲钩鍧囧€?
    const allGroupsAvg = groupAverages.reduce((a, b) => a + b, 0) / groupAverages.length;
    
    // 3. 鎺掑簭澶勭悊
    // 3.1 鎸夊钩鍧囩エ鏁版帓搴?
    const sortedIndices = groupAverages
        .map((avg, index) => ({ avg, index }))
        .sort((a, b) => b.avg - a.avg)
        .map(item => item.index);
    
    // 3.2 閲嶆柊鎺掑簭缁勫拰骞冲潎鍊?
    const sortedGroups = sortedIndices.map(index => groups[index]);
    const sortedAverages = sortedIndices.map(index => groupAverages[index]);
    
    // 4. 璁＄畻缁勯棿宸紓鍜屽緱绁ㄧ巼
    const comparisons = sortedAverages.map((avg, index) => {
        const nextAvg = sortedAverages[index + 1];
        return {
            avg: parseFloat(avg.toFixed(1)),         // 缁勫钩鍧囩エ鏁帮紝淇濈暀1浣嶅皬鏁?
            voteRate: ((avg / allGroupsAvg) * 100).toFixed(1),  // 鐩稿浜庢€诲钩鍧囩殑鐧惧垎姣?
            diff: nextAvg !== undefined ? parseFloat((avg - nextAvg).toFixed(1)) : null,  // 涓庝笅涓€缁勭殑宸窛
            rank: index + 1                          // 鎺掑悕
        };
    });
    
    // 5. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - sortedGroups: 鎸夊钩鍧囩エ鏁版帓搴忓悗鐨勭粍鏁扮粍锛屾瘡涓粍鍖呭惈澶氫釜瑙掕壊瀵硅薄
    //   [{name, votes, ip}, ...]
    // - comparisons: 姣忎釜缁勭殑瀵规瘮鏁版嵁鏁扮粍
    //   [{avg, voteRate, diff, rank}, ...]
    // - totalVotes: 鎵€鏈夎鑹茬殑鎬荤エ鏁?
    // - allGroupsAvg: 鎵€鏈夌粍鐨勫钩鍧囩エ鏁?
    return this.generateGroupAvgHTML(sortedGroups, comparisons, totalVotes, allGroupsAvg);
}`,
        'group-base-total': `// 缁勫熀鍑嗘€荤エ鏁板姣旈€昏緫
if (compareType === COMPARISON_TYPES.groupBaseTotalCompare) {
    // 1. 鑾峰彇鎵€鏈夌粍
    const groups = [];
    const comparison = document.querySelector(SELECTORS.characterComparison);
    const groupElements = comparison.querySelectorAll(SELECTORS.characterGroup);
    
    groupElements.forEach(groupElement => {
        const members = groupElement.querySelectorAll(SELECTORS.groupMember);
        const group = Array.from(members).map(member => {
            const name = member.querySelector(SELECTORS.characterAvatar).alt;
            const ip = member.querySelector(SELECTORS.characterAvatar).title.split('@')[1];
            return characters.find(char => char.name === name && char.ip === ip);
        });
        groups.push(group);
    });

    // 2. 璁＄畻鍩哄噯缁勶紙绗竴缁勶級鐨勬€荤エ鏁?
    const baseGroup = groups[0];
    const baseTotal = baseGroup.reduce((sum, char) => {
        return sum + (char.votes === '-' ? 0 : parseInt(char.votes));
    }, 0);
    
    // 3. 璁＄畻鍏朵粬缁勪笌鍩哄噯缁勭殑宸紓
    // 3.1 璁＄畻鎵€鏈夌粍鐨勬€荤エ鏁?
    const allGroupsTotal = groups.reduce((sum, group) => {
        return sum + group.reduce((groupSum, char) => {
            return groupSum + (char.votes === '-' ? 0 : parseInt(char.votes));
        }, 0);
    }, 0);

    // 3.2 璁＄畻姣忕粍鐨勫姣旀暟鎹?
    const comparisons = groups.map((group, index) => {
        const total = group.reduce((sum, char) => {
            return sum + (char.votes === '-' ? 0 : parseInt(char.votes));
        }, 0);
        
        return {
            total,                   // 缁勬€荤エ鏁?
            voteRate: ((total / allGroupsTotal) * 100).toFixed(1),  // 缁勫緱绁ㄧ巼
            baseDiff: total - baseTotal,  // 涓庡熀鍑嗙粍鐨勭エ鏁板樊璺?
            rateDiff: ((total - baseTotal) / allGroupsTotal * 100).toFixed(1),  // 涓庡熀鍑嗙粍鐨勫緱绁ㄧ巼宸窛
            isLeading: total > baseTotal,  // 鏄惁棰嗗厛浜庡熀鍑嗙粍
            isBase: index === 0      // 鏄惁鏄熀鍑嗙粍
        };
    });
    
    // 4. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - groups: 鎵€鏈夌粍鐨勬暟缁勶紝姣忎釜缁勫寘鍚涓鑹插璞?
    //   [[{name, votes, ip}, ...], ...]
    // - comparisons: 姣忎釜缁勭殑瀵规瘮鏁版嵁鏁扮粍
    //   [{total, voteRate, baseDiff, rateDiff, isLeading, isBase}, ...]
    // - totalVotes: 鎵€鏈夎鑹茬殑鎬荤エ鏁帮紙鍖呮嫭鏈垎缁勭殑锛?
    return this.generateGroupBaseTotalHTML(groups, comparisons, totalVotes);
}`,
        'group-base-avg': `// 缁勫熀鍑嗗钩鍧囧€煎姣旈€昏緫
if (compareType === COMPARISON_TYPES.groupBaseAvgCompare) {
    // 1. 鑾峰彇鎵€鏈夌粍
    const groups = [];
    const comparison = document.querySelector(SELECTORS.characterComparison);
    const groupElements = comparison.querySelectorAll(SELECTORS.characterGroup);
    
    groupElements.forEach(groupElement => {
        const members = groupElement.querySelectorAll(SELECTORS.groupMember);
        const group = Array.from(members).map(member => {
            const name = member.querySelector(SELECTORS.characterAvatar).alt;
            const ip = member.querySelector(SELECTORS.characterAvatar).title.split('@')[1];
            return characters.find(char => char.name === name && char.ip === ip);
        });
        groups.push(group);
    });

    // 2. 璁＄畻鍩哄噯缁勶紙绗竴缁勶級鐨勫钩鍧囩エ鏁?
    const baseGroup = groups[0];
    const baseAvg = baseGroup.reduce((sum, char) => {
        return sum + (char.votes === '-' ? 0 : parseInt(char.votes));
    }, 0) / baseGroup.length;
    
    // 3. 璁＄畻鎵€鏈夌粍鐨勬€荤エ鏁帮紙鐢ㄤ簬璁＄畻鍗犳瘮锛?
    const allGroupsTotal = groups.reduce((sum, group) => {
        return sum + group.reduce((groupSum, char) => {
            return groupSum + (char.votes === '-' ? 0 : parseInt(char.votes));
        }, 0);
    }, 0);

    // 4. 璁＄畻姣忕粍鐨勫钩鍧囩エ鏁板拰涓庡熀鍑嗙粍鐨勫樊寮?
    const comparisons = groups.map((group, index) => {
        const avg = group.reduce((sum, char) => {
            return sum + (char.votes === '-' ? 0 : parseInt(char.votes));
        }, 0) / group.length;
        
        return {
            avg,                    // 缁勫钩鍧囩エ鏁?
            voteRate: ((avg / (allGroupsTotal / groups.length)) * 100).toFixed(1),  // 鐩稿浜庢€诲钩鍧囩殑鐧惧垎姣?
            baseDiff: avg - baseAvg,  // 涓庡熀鍑嗙粍鐨勫钩鍧囩エ鏁板樊璺?
            rateDiff: ((avg - baseAvg) / baseAvg * 100).toFixed(1),  // 涓庡熀鍑嗙粍鐨勫緱绁ㄧ巼宸窛
            isLeading: avg > baseAvg,  // 鏄惁棰嗗厛浜庡熀鍑嗙粍
            isBase: index === 0     // 鏄惁鏄熀鍑嗙粍
        };
    });
    
    // 5. 鐢熸垚瀵规瘮缁撴灉鐨凥TML
    // 鍙傛暟璇存槑锛?
    // - groups: 鎵€鏈夌粍鐨勬暟缁勶紝姣忎釜缁勫寘鍚涓鑹插璞?
    //   [[{name, votes, ip}, ...], ...]
    // - comparisons: 姣忎釜缁勭殑瀵规瘮鏁版嵁鏁扮粍
    //   [{avg, voteRate, baseDiff, rateDiff, isLeading, isBase}, ...]
    // - totalVotes: 鎵€鏈夎鑹茬殑鎬荤エ鏁帮紙鍖呮嫭鏈垎缁勭殑锛?
    return this.generateGroupBaseAvgHTML(groups, comparisons, totalVotes);
}`,
    };

    // 鍒濆鍖栦唬鐮佺ず渚?
    function initCodeExamples() {
        const activeSection = document.querySelector('.code-section.active');
        if (activeSection) {
            const type = activeSection.dataset.type;
            const code = activeSection.querySelector('code');
            if (code && CODE_EXAMPLES[type]) {
                // 绉婚櫎宸叉湁鐨勭被鍜屽睘鎬?
                code.className = 'language-javascript';
                code.removeAttribute('data-highlighted');
                
                // 鍏堟竻绌轰唬鐮佸唴瀹?
                code.innerHTML = '';
                
                // 鍏堥珮浜唬鐮?
                const tempCode = document.createElement('code');
                tempCode.className = 'language-javascript';
                tempCode.textContent = CODE_EXAMPLES[type];
                hljs.highlightElement(tempCode);
                
                // 鑾峰彇楂樹寒鍚庣殑HTML骞舵寜琛屽垎鍓?
                const highlightedLines = tempCode.innerHTML.split('\n');
                
                // 閫愯娣诲姞楂樹寒鍚庣殑浠ｇ爜锛屽苟涓烘瘡琛屾坊鍔犲姩鐢?
                highlightedLines.forEach((line, index) => {
                    // 鍒涘缓琛屽鍣?
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'code-line';
                    lineDiv.style.opacity = '0';
                    lineDiv.style.transform = 'translateX(20px)';
                    lineDiv.style.transition = 'all 0.3s ease';
                    lineDiv.style.transitionDelay = `${index * 0.05}s`;
                    
                    // 娣诲姞楂樹寒鍚庣殑浠ｇ爜鍐呭
                    lineDiv.innerHTML = line || '&nbsp;';  // 澶勭悊绌鸿
                    
                    // 娣诲姞鍒颁唬鐮佸潡
                    code.appendChild(lineDiv);
                    
                    // 瑙﹀彂鍔ㄧ敾
                    setTimeout(() => {
                        lineDiv.style.opacity = '1';
                        lineDiv.style.transform = 'translateX(0)';
                    }, 50);
                });
            }
        }
    }

    // Tab 鍒囨崲鏃舵洿鏂颁唬鐮?
    function updateCodeExample(type) {
        const codeSection = document.querySelector(`.code-section[data-type="${type}"]`);
        if (codeSection && CODE_EXAMPLES[type]) {
            const code = codeSection.querySelector('code');
            
            // 绉婚櫎宸叉湁鐨勭被鍜屽睘鎬?
            code.className = 'language-javascript';
            code.removeAttribute('data-highlighted');
            
            // 鍏堟竻绌轰唬鐮佸唴瀹?
            code.innerHTML = '';
            
            // 鑾峰彇浠ｇ爜鏂囨湰骞舵寜琛屽垎鍓?
            const codeLines = CODE_EXAMPLES[type].split('\n');
            
            // 鍏堥珮浜唬鐮?
            const tempCode = document.createElement('code');
            tempCode.className = 'language-javascript';
            tempCode.textContent = CODE_EXAMPLES[type];
            hljs.highlightElement(tempCode);
            
            // 鑾峰彇楂樹寒鍚庣殑HTML骞舵寜琛屽垎鍓?
            const highlightedLines = tempCode.innerHTML.split('\n');
            
            // 閫愯娣诲姞楂樹寒鍚庣殑浠ｇ爜锛屽苟涓烘瘡琛屾坊鍔犲姩鐢?
            highlightedLines.forEach((line, index) => {
                // 鍒涘缓琛屽鍣?
                const lineDiv = document.createElement('div');
                lineDiv.className = 'code-line';
                lineDiv.style.opacity = '0';
                lineDiv.style.transform = 'translateX(20px)';
                lineDiv.style.transition = 'all 0.3s ease';
                lineDiv.style.transitionDelay = `${index * 0.05}s`;
                
                // 娣诲姞楂樹寒鍚庣殑浠ｇ爜鍐呭
                lineDiv.innerHTML = line || '&nbsp;';  // 澶勭悊绌鸿
                
                // 娣诲姞鍒颁唬鐮佸潡
                code.appendChild(lineDiv);
                
                // 瑙﹀彂鍔ㄧ敾
                setTimeout(() => {
                    lineDiv.style.opacity = '1';
                    lineDiv.style.transform = 'translateX(0)';
                }, 50);
            });
        }
    }

    // 淇敼鍒濆鍖栭『搴?
    initCodeExamples();   // 鍏堝姞杞戒唬鐮佺ず渚?
    initCodeExpand();     // 鍐嶅垵濮嬪寲灞曞紑鎸夐挳
}); 