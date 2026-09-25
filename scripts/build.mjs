import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const ignoredRootEntries = new Set(['.git', '.github', '.specstory', '.cache', '.vscode', 'dist', 'node_modules']);
const ignoredRootFiles = new Set(['README.md', 'data-refactor-plan.md', 'frontend-development-standards.md', 'package.json']);
const ignoredHtmlFiles = new Set(['temp.html', 'temp2.html']);
const buildFeatures = {
    danmaku: false
};
const includePattern = /<include\s+src=["']([^"']+)["']\s*><\/include>/gi;
const includeStack = [];
const pathSeparator = '\\';

function replaceTemplateValues(content) {
    return content
        .replace(/\{\{defaultInterval\}\}/g, '0.5')
        .replace(/\{\{minSpeed\}\}/g, '1')
        .replace(/\{\{maxSpeed\}\}/g, '60')
        .replace(/\{\{defaultSpeed\}\}/g, '15');
}

function splitDocument(content) {
    return {
        head: content.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '',
        body: content.match(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/i)?.[1] ?? ''
    };
}

async function renderIncludes(content) {
    let result = '';
    let cursor = 0;
    const pattern = new RegExp(includePattern.source, includePattern.flags);

    for (const match of content.matchAll(pattern)) {
        const [fullMatch, source] = match;
        const matchIndex = match.index;
        result += content.slice(cursor, matchIndex);

        const includePath = resolve(root, source);
        const includedContent = await renderFile(includePath);
        const includedDocument = splitDocument(includedContent);
        result += includedDocument.head || includedDocument.body ? '' : includedContent;
        cursor = matchIndex + fullMatch.length;
    }

    return result + content.slice(cursor);
}

async function renderFile(filePath) {
    if (includeStack.includes(filePath)) {
        const chain = [...includeStack, filePath].map(file => relative(root, file)).join(' -> ');
        throw new Error(`检测到模板循环引用: ${chain}`);
    }

    includeStack.push(filePath);
    try {
        const source = replaceTemplateValues(await readFile(filePath, 'utf8'));
        return await renderIncludes(source);
    } finally {
        includeStack.pop();
    }
}

function removeDisabledFeatureMarkup(content) {
    if (buildFeatures.danmaku) return content;
    return content
        .replace(/\s*<div class="danmaku-settings-container">[\s\S]*?<\/div>\s*(?=<\/div>\s*<\/nav>)/i, '')
        .replace(/\s*<div id="danmaku-container" class="animation-container"><\/div>/i, '');
}

function removeRuntimeTemplateScripts(content) {
    const pattern = /\s*<script\b[^>]*\bsrc=["'][^"']*(?:template-loader|footer)\.js[^"']*(?:["'])[^>]*>\s*<\/script>/gi;
    return content.replace(pattern, '');
}

function getActivePage(source) {
    const normalizedPath = relative(root, source).replace(/\\/g, '/');

    if (normalizedPath === 'index.html') return 'home';
    if (normalizedPath.includes('/schedule/')) return 'schedule';
    if (normalizedPath.includes('/events-data/') || normalizedPath.includes('/visualization/') || normalizedPath.includes('/tables/')) return 'events-data';
    if (normalizedPath.includes('/characters-data/') || normalizedPath.includes('/characters-detail/')) return 'characters-data';
    if (normalizedPath.includes('/gallery/')) return 'gallery';
    if (normalizedPath.includes('/about/')) return 'about';
    if (normalizedPath.includes('/development-standards/')) return 'development-standards';
    if (normalizedPath.includes('/comparison/')) return 'comparison';
    if (normalizedPath.includes('/statistics/')) return 'statistics';

    return '';
}

function activateNavLink(headerBody, activePage) {
    if (!activePage) return headerBody;

    const pattern = new RegExp(`(<a\\b(?=[^>]*\\bdata-page=["']${activePage}["'])(?=[^>]*\\bclass=["'])([^>]*\\bclass=["']))([^"']*)(["'][^>]*>)`, 'i');
    return headerBody.replace(pattern, (_match, start, _classStart, classNames, end) => {
        if (classNames.split(/\s+/).includes('active')) return `${start}${classNames}${end}`;
        return `${start}${classNames} active${end}`;
    });
}

function getBodyAttributes(content) {
    return content.match(/<body(\s[^>]*)?>/i)?.[1] ?? '';
}

function appendFeatureHead(content) {
    if (!buildFeatures.danmaku) return content;
    return content.replace(/<\/head>/i, '    <link rel="stylesheet" href="css/common/animation-container.css">\n</head>');
}

function appendBootstrapScripts(content) {
    const scripts = ['    <script type="module" src="js/common/nav-state.js"></script>'];
    if (buildFeatures.danmaku) {
        scripts.push('    <script type="module" src="js/common/danmaku-bootstrap.js"></script>');
    }
    return content.replace(/<\/body>/i, `${scripts.join('\n')}\n</body>`);
}

async function collectHtmlFiles(directory, files = []) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || ignoredHtmlFiles.has(entry.name) || entry.name === 'dist') continue;
        const entryPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'templates' && entry.name !== 'node_modules') {
                await collectHtmlFiles(entryPath, files);
            }
        } else if (extname(entry.name).toLowerCase() === '.html') {
            files.push(entryPath);
        }
    }
    return files;
}

async function copyStaticEntries() {
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if (ignoredRootEntries.has(entry.name) || ignoredRootFiles.has(entry.name) || entry.name === 'scripts' || entry.name === 'templates' || (entry.isFile() && extname(entry.name).toLowerCase() === '.html')) continue;
        const source = join(root, entry.name);
        const target = join(output, entry.name);
        await cp(source, target, { recursive: true, force: true, filter: path => !path.includes(`${join(root, 'templates')}${pathSeparator}`) });
    }
}

async function buildPage(source) {
    const rendered = await renderFile(source);
    const page = splitDocument(rendered);
    if (!page.head || !page.body) throw new Error(`页面缺少 head 或 body: ${relative(root, source)}`);

    const header = splitDocument(await renderFile(join(root, 'templates', 'header.html')));
    const footer = splitDocument(await renderFile(join(root, 'templates', 'footer.html')));
    const headerBody = activateNavLink(removeDisabledFeatureMarkup(header.body), getActivePage(source));
    const pageBody = removeDisabledFeatureMarkup(page.body);
    const outputContent = removeRuntimeTemplateScripts(appendBootstrapScripts(
        rendered
            .replace(/<head>([\s\S]*?)<\/head>/i, `<head>${page.head}${header.head}</head>`)
            .replace(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/i, (_match, bodyContent) => `<body${getBodyAttributes(rendered)}>${headerBody}${pageBody}${footer.body}</body>`)
    ));
    const finalContent = appendFeatureHead(outputContent);

    const relativePath = relative(root, source);
    const target = join(output, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, finalContent, 'utf8');
}

async function build() {
    await rm(output, { recursive: true, force: true });
    await mkdir(output, { recursive: true });
    await copyStaticEntries();

    const htmlFiles = await collectHtmlFiles(root);
    for (const source of htmlFiles) await buildPage(source);

    console.log(`构建完成：${htmlFiles.length} 个 HTML 页面 -> ${relative(root, output)}`);
}

await build();
