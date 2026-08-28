# 项目前端开发规范（DOM 操作与性能优化篇）

核心思想：减少浏览器回流/重绘，防范 XSS 安全风险，提升代码可维护性与执行效率。

## 1. DOM 节点创建：少用 `innerHTML`，尽量用 `<template>` 克隆

### ❌ 不推荐

- 拼接大段的 HTML 字符串赋值给 `innerHTML`（存在 XSS 风险且损耗解析性能）。
- 在循环中频繁调用 `document.createElement()` 逐个创建复杂结构。

### ✅ 推荐

对于重复性高、结构固定的 UI 模块（如列表项、卡片），将 HTML 结构写在 `<template>` 标签中，使用 `cloneNode(true)` 克隆。

优点：模板仅被解析一次，克隆速度远快于逐个创建，且结构与样式分离。

```html
<!-- 定义模板 -->
<template id="user-card">
  <div class="card"><span class="name"></span><span class="desc"></span></div>
</template>
```

```javascript
// 推荐做法
const template = document.getElementById('user-card');
const clone = template.content.cloneNode(true);
clone.querySelector('.name').textContent = '张三';
container.appendChild(clone);
```

## 2. 渲染函数返回值：少返回“HTML 字符串”，尽量返回“模板克隆后的 DOM 节点”（Node / DocumentFragment）

### ❌ 不推荐

```javascript
// 返回反引号拼接的字符串，难以维护且不安全
export function renderCard(data) {
  return `<div><p>${data.name}</p></div>`;
}
```

### ✅ 推荐

```html
<template id="card-template">
  <div class="card">
    <p class="name"></p>
  </div>
</template>
```

```javascript
export function renderCard(data) {
  const template = document.getElementById('card-template');
  const fragment = template.content.cloneNode(true);
  fragment.querySelector('.name').textContent = data.name;
  return fragment;
}
```

说明：如果结构是固定的，优先用 `<template>` 克隆；`createElement` 只作为少量、临时、无模板可复用场景的兜底手段。

## 3. 样式修改：少用 `style.xxx`，尽量用 CSS 变量 + `classList`

### ❌ 不推荐

```javascript
element.style.color = 'red';
element.style.fontSize = '16px';
// 操作多个样式会频繁触发样式计算，且权重过高难以覆写。
```

### ✅ 推荐

- 状态切换：使用 `classList.add()` / `toggle()` 切换预置类。
- 动态数值：修改根 CSS 变量（`setProperty`），利用 CSS 自动派生样式。

```css
:root { --theme-color: blue; }
.active { color: var(--theme-color); }
.highlight { background: yellow; }
```

```javascript
// 状态切换
element.classList.toggle('active');

// 动态数值（如进度条）
document.documentElement.style.setProperty('--offset', value + 'px');
```

## 4. 批量插入 DOM：少用循环 `appendChild`，尽量用 `DocumentFragment`（文档碎片）

### ❌ 不推荐

```javascript
const list = document.getElementById('list');
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  list.appendChild(li); // 每次循环都触发浏览器重排（Reflow）
}
```

### ✅ 推荐

```html
<template id="list-item-template">
  <li class="list-item"></li>
</template>
```

```javascript
const list = document.getElementById('list');
const template = document.getElementById('list-item-template');
const fragment = document.createDocumentFragment();

for (let i = 0; i < 1000; i++) {
  const li = template.content.cloneNode(true);
  li.querySelector('.list-item').textContent = `Item ${i}`;
  fragment.appendChild(li);
}

list.appendChild(fragment); // 只触发一次重排，性能提升巨大
```

## 5. 事件监听：少用“逐个绑定”，尽量用事件委托（Event Delegation）

### ❌ 不推荐

```javascript
// 给 100 个 li 分别绑定监听，消耗内存，且动态新增的 li 无法响应
document.querySelectorAll('li').forEach(item => {
  item.addEventListener('click', handler);
});
```

### ✅ 推荐

```javascript
// 利用事件冒泡，只给父容器绑定一个监听器
const ul = document.getElementById('list');
ul.addEventListener('click', (e) => {
  // 通过 closest 精准定位目标元素
  const li = e.target.closest('li');
  if (li) {
    console.log('点击了：', li.textContent);
  }
});
// 新增的 li 自动拥有事件响应能力，无需重复绑定
```

## 6. 定时动画：少用 `setInterval`，尽量用 `requestAnimationFrame`

### ❌ 不推荐

```javascript
// 即使页面切到后台依然执行，浪费 CPU；执行时机不可控，容易掉帧
setInterval(() => {
  moveElement();
}, 16);
```

### ✅ 推荐

```javascript
function animate() {
  moveElement();
  requestAnimationFrame(animate); // 跟随屏幕刷新率（60/120Hz），后台自动暂停
}
requestAnimationFrame(animate);
```

适用场景：滚动监听、拖拽、缓动动画、Canvas 绘制等高频视觉更新。

## 7. 数据处理：少用 `||` 和深层 `if`，尽量用可选链 `?.` + 空值合并 `??` + 策略模式

### ❌ 不推荐

```javascript
// 深层判断容易白屏且冗长
if (data && data.user && data.user.info) {
  console.log(data.user.info.name);
}

// 使用 || 会错误地将空字符串 '' 或 0 视为假值
let name = data.name || '游客';

// 大量的 if/else 难以维护
if (type === 1) { /* A逻辑 */ } 
else if (type === 2) { /* B逻辑 */ }
```

### ✅ 推荐

```javascript
// 1. 可选链 + 空值合并（只有 null/undefined 才取默认值）
const name = data?.user?.info?.name ?? '游客';
const count = data?.count ?? 0;

// 2. 策略模式（使用对象映射代替 if/else）
const strategyMap = {
  1: () => { /* A逻辑 */ },
  2: () => { /* B逻辑 */ },
  3: () => { /* C逻辑 */ },
};
const execute = strategyMap[type] || strategyMap['default'];
execute();
```

## 8. 数据请求：做“有策略的缓存”，而非“每次重新请求”或“无限缓存”

### ❌ 不推荐

- 每次都重新请求（体验差、浪费带宽）。
- 无限期缓存永不过期（数据陈旧）。

### ✅ 推荐

- 静态数据（省市区、枚举）：首次加载后缓存到内存 / `sessionStorage`，会话内复用。
- 动态列表数据：设置 TTL（如 5 分钟），超时后自动刷新。
- 实时性要求高的数据（余额、状态）：每次请求，不做缓存。

```javascript
const cache = new Map();

function fetchWithCache(key, fetcher, ttl = 5 * 60 * 1000) {
  if (cache.has(key) && Date.now() - cache.get(key).time < ttl) {
    return Promise.resolve(cache.get(key).data);
  }

  return fetcher().then(data => {
    cache.set(key, { data, time: Date.now() });
    return data;
  });
}
```

## 9. 列表更新：做“数据驱动的精准更新”，而非“整块重渲染”或“手写 DOM 映射”

### ❌ 不推荐

- 数据一变化就清空列表重建（性能差、丢失滚动/焦点状态）。
- 手动维护 DOM 节点映射表（复杂度高，容易内存泄漏）。

### ✅ 推荐

- 用数据 ID 作为 `data-id` 属性，更新时先查找 DOM 节点是否存在。
- 存在则只更新变化字段的 `textContent` / 类名。
- 不存在则插入新节点；被删除的节点直接 `remove()`。

```javascript
function updateList(container, items) {
  // 用 data-id 做精准 Diff
  const existingIds = new Set();
  container.querySelectorAll('[data-id]').forEach(el => existingIds.add(el.dataset.id));

  items.forEach(item => {
    const el = container.querySelector(`[data-id="${item.id}"]`);
    if (el) {
      updateExistingNode(el, item); // 只改内容
    } else {
      container.appendChild(createNode(item)); // 新增
    }
  });

  // 移除不在新数据中的节点
  container.querySelectorAll('[data-id]').forEach(el => {
    if (!items.some(item => String(item.id) === el.dataset.id)) {
      el.remove();
    }
  });
}
```

## 10. 交互反馈：区分场景使用 Debounce / Throttle / RAF，而非“一刀切”

### ❌ 不推荐

- 所有高频事件都不做控制（导致卡顿）。
- 所有高频事件都加防抖（导致输入延迟感强）。

### ✅ 推荐

| 场景 | 策略 | 延迟 / 时机 |
| --- | --- | --- |
| 搜索框输入 | Debounce | 300ms |
| 滚动 / resize | Throttle | 100ms |
| 拖拽 / 动画 | requestAnimationFrame | 跟随屏幕刷新率 |
| 按钮连点 | Debounce | 500ms（防重复提交） |

```javascript
// 搜索框：防抖
input.addEventListener('input', debounce(() => {
  renderList(filterData(input.value));
}, 300));

// 滚动：节流
window.addEventListener('scroll', throttle(() => {
  updateScrollIndicator();
}, 100));
```

补充原则：在保证用户体验流畅的前提下，优先保证代码可读性和功能正确性。当遇到真实性能瓶颈时，再针对性地引入缓存、Diff 更新、防抖节流等优化手段。

## 特邀原则：Fail Fast 原则（Fail Fast Principle）

关键条件不满足时立即抛出明确错误，禁止使用降级处理、容错逻辑、包裹在 `if` 语句块内、逻辑或运算符、三元运算符、可选链或空值合并运算符隐藏架构问题，让依赖缺失、DOM 结构错误、参数无效、配置错误等问题在开发阶段早期暴露，避免在生产环境中出现不可预测的行为。

### ❌ 不推荐

以下七种写法都会把关键错误隐藏起来：

#### 1. 降级处理

```javascript
const button = findSubmitButton() || createFallbackButton();
```

#### 2. 容错逻辑

```javascript
try {
  startApplication();
} catch (error) {
  console.warn('启动失败，继续显示空页面', error);
}
```

#### 3. `if` 语句块

```javascript
const button = document.querySelector('.submit');
if (button) {
  button.addEventListener('click', submit);
}
```

#### 4. 逻辑或运算符

```javascript
const timeout = config.timeout || 3000;
```

#### 5. 三元运算符

```javascript
const url = config.apiUrl ? config.apiUrl : '/fallback-api';
```

#### 6. 可选链

```javascript
const modal = page?.components?.modal;
```

#### 7. 空值合并运算符

```javascript
const endpoint = config.endpoint ?? '/default-endpoint';
```

### ✅ 推荐

启动阶段立即校验关键依赖、DOM 和参数，失败时抛出包含上下文的明确错误：

```javascript
const button = document.querySelector('.submit');
if (!button) {
  throw new Error('启动失败：缺少 .submit 按钮');
}

if (!Number.isFinite(config.timeout)) {
  throw new Error('配置错误：timeout 必须是有效数字');
}
```

## 附：代码审查（Code Review）检查清单

- □ 是否存在大段的 `innerHTML` 赋值或模板字符串拼接用户数据？
- □ `render` 开头的函数是否返回了 Node / Fragment 而非 String？
- □ 是否有超过 3 层以上的三元运算符或 `if/else` 嵌套？
- □ 循环内是否直接操作了 DOM（append / style 修改）？
- □ 列表渲染是否使用了事件委托而非逐个绑定？
- □ 动画效果是否使用了 `requestAnimationFrame`？
- □ 是否针对数据类型设计了合适的缓存策略，而不是“一刀切全缓存”或“完全不缓存”？
- □ 列表数据变化时，是否做到了基于 `data-id` 的最小化更新？
- □ 搜索、滚动、拖拽、按钮提交等高频交互，是否使用了合适的 Debounce / Throttle / RAF？
- □ 关键依赖、DOM、参数和配置不满足时，是否立即抛出明确错误，而不是使用降级或容错逻辑隐藏问题？
