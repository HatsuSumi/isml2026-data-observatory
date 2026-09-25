import { DanmakuGenerator } from './danmaku-generator.js';

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = 'css/common/animation-container.css';
document.head.appendChild(style);

const copyTip = document.createElement('div');
copyTip.className = 'copy-tip';
copyTip.textContent = '复制成功';
document.body.appendChild(copyTip);

const container = document.querySelector('#danmaku-container, .animation-container') ?? document.createElement('div');
container.className = 'animation-container';
if (!container.isConnected) document.body.appendChild(container);

new DanmakuGenerator(container);
