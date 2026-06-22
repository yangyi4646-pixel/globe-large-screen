#!/usr/bin/env node
/**
 * design-lint.mjs —— BI 看板页面「设计 lint」
 *
 * 纯静态扫描 CSS，机械检查生成的 BI 看板是否违反硬性视觉约束。
 * 不依赖截图、不引入任何 npm 依赖，只用 Node 内置模块。
 *
 * 用法:
 *   node scripts/design-lint.mjs [文件或目录 ...]
 *   无参数时默认扫描 src/styles.css + docs/design/skeleton-workbench.html
 *   + docs/design/skeleton-dashboard.html（存在才扫）。
 *
 * 退出码: 有 error → 1; 只有 warning 或全过 → 0。
 */

import fs from 'node:fs';
import path from 'node:path';

/* ----------------------------- 阈值常量 ----------------------------- */

const MAX_FONT_PX = 40; // font-size px 超过即 error
const WARN_FONT_PX = 32; // font-size px 落在 [32, 40] 之间 → warning
const MAX_RADIUS_PX = 8; // border-radius px 超过即 error
const PILL_RADIUS_PX = 900; // >= 此值视为 pill/圆形，不算违规
const MAX_SHADOW_BLUR_PX = 8; // box-shadow 模糊半径超过即 error
const MAX_WIDTH_REQUIRED = true; // 是否要求出现 max-width + px

/* ----------------------------- 工具函数 ----------------------------- */

/** 解析像素数值; 非 px 单位返回 null（跳过不判）。 */
function parsePx(token) {
    const t = String(token).trim();
    const m = /^(-?\d*\.?\d+)px$/i.exec(t);
    if (m) return parseFloat(m[1]);
    return null;
}

/**
 * 从一个 length 形态的字符串里取「用于判定的像素值」。
 * - 纯 px → 该值
 * - clamp(min, pref, max) → 取 max（最坏情况）
 * - 其它单位 / 无法确定 → null（保守跳过）
 */
function lengthToPx(raw) {
    const v = String(raw).trim();
    const clamp = /^clamp\(\s*(.+)\s*\)$/i.exec(v);
    if (clamp) {
        const parts = splitTopLevel(clamp[1], ',');
        if (parts.length === 3) {
            // 取 max（第三个参数）
            return lengthToPx(parts[2]);
        }
        return null;
    }
    return parsePx(v);
}

/** 按分隔符切分，忽略括号内的分隔符。 */
function splitTopLevel(str, sep) {
    const out = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === sep && depth === 0) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    if (cur.trim() !== '' || out.length > 0) out.push(cur);
    return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** 去掉 CSS 注释（保留换行以维持行号）。 */
function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 从 HTML 中提取所有 <style> 块的内容，保留原文行号偏移。 */
function extractStyleBlocks(html) {
    const blocks = [];
    const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const inner = m[1];
        const before = html.slice(0, m.index + m[0].indexOf(inner));
        const startLine = before.split('\n').length;
        blocks.push({ css: inner, startLine });
    }
    return blocks;
}

/** 取某个偏移量在文本中的行号（1 基）。 */
function lineAt(text, index) {
    let line = 1;
    for (let i = 0; i < index && i < text.length; i++) {
        if (text[i] === '\n') line++;
    }
    return line;
}

/**
 * 收集 CSS 自定义属性定义: --name: value
 * 返回 Map<name, value>。后定义覆盖先定义（够用）。
 */
function collectVars(css) {
    const vars = new Map();
    const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)\s*(?:;|\})/g;
    let m;
    while ((m = re.exec(css)) !== null) {
        vars.set(m[1].trim(), m[2].trim());
    }
    return vars;
}

/** 递归解析 var(...) 引用，最多 10 层，防止环。 */
function resolveVars(value, vars, depth = 0) {
    if (depth > 10) return value;
    if (!/var\(/i.test(value)) return value;
    const resolved = value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*))?\)/gi, (full, name, fallback) => {
        if (vars.has(name)) return vars.get(name);
        if (fallback != null) return fallback;
        return full; // 解析不出来，原样保留
    });
    if (resolved === value) return resolved;
    return resolveVars(resolved, vars, depth + 1);
}

/* ----------------------------- 单条声明级检查 ----------------------------- */

/**
 * 解析 box-shadow 的一个（多重 shadow 中的）单层，返回模糊半径 px 或 null。
 * 处理: inset 关键字、颜色、负的扩散值。
 * 规则: 去掉 inset / 颜色后，按空白切分，收集 length token。
 *   - 至少 2 个 length（offset-x offset-y）才算有效 shadow，否则跳过。
 *   - 第 3 个 length 即 blur-radius。
 */
function shadowBlurPx(layer) {
    let s = layer.trim();
    if (s === '' || /^none$/i.test(s)) return null;
    // 去掉 inset 关键字
    s = s.replace(/\binset\b/gi, ' ');
    // 去掉颜色: #hex、rgb()/rgba()/hsl()/hsla()、颜色关键字会留下，但颜色关键字不是 length，切分后会被忽略
    s = s.replace(/#[0-9a-f]{3,8}\b/gi, ' ');
    s = s.replace(/\b(?:rgba?|hsla?)\([^()]*\)/gi, ' ');
    s = s.replace(/\bvar\([^()]*\)/gi, ' ');
    const tokens = splitTopLevel(s, ' ');
    // 只保留能解析成 px 的、或明确是非 px 长度单位的 token
    const lengths = [];
    let uncertain = false;
    for (const tok of tokens) {
        const px = parsePx(tok);
        if (px != null) {
            lengths.push(px);
        } else if (/^-?0+(\.0+)?$/.test(tok)) {
            // 裸 0 是合法长度（CSS 中 0 可省略单位），按 0px 处理
            lengths.push(0);
        } else if (/^-?\d*\.?\d+(rem|em|%|vw|vh|pt|cm|mm|ex|ch)$/i.test(tok)) {
            // 非 px 长度，记一个占位（无法换算）
            lengths.push(NaN);
        } else if (/^-?\d*\.?\d+$/.test(tok)) {
            // 非 0 的裸数字，少见且语义不明 → 标记不确定
            uncertain = true;
        }
        // 其它（颜色关键字等）忽略
    }
    if (lengths.length < 3) {
        // 没有 blur 分量，或解析不全 → 保守跳过
        return null;
    }
    const blur = lengths[2];
    if (Number.isNaN(blur)) {
        // blur 是非 px 单位，无法判定 → 跳过
        return null;
    }
    if (uncertain) return null;
    return blur;
}

/* ----------------------------- 主扫描逻辑 ----------------------------- */

/**
 * 扫描一段 CSS。
 * @param {string} rawCss 原始 CSS 文本
 * @param {number} lineOffset 行号偏移（HTML <style> 块用），CSS 文件为 0
 * @param {boolean} isMainCss 是否是主 .css 文件（影响 token 检查的措辞）
 * @returns {{errors: Array, warnings: Array, sawMaxWidthPx: boolean}}
 */
function scanCss(rawCss, lineOffset, ctx) {
    const css = stripComments(rawCss);
    const vars = collectVars(css);
    const errors = [];
    const warnings = [];
    let sawMaxWidthPx = false;

    const reportLine = (idx) => lineAt(css, idx) + lineOffset;

    /* --- 检查 1 & 6: font-size --- */
    {
        const re = /font-size\s*:\s*([^;{}]+)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const rawVal = m[1].trim();
            const resolved = resolveVars(rawVal, vars);
            const px = lengthToPx(resolved);
            if (px == null) continue; // 非 px 或无法判定，跳过
            const ln = reportLine(m.index);
            const shown = resolved === rawVal ? rawVal : `${rawVal} → ${resolved}`;
            if (px > MAX_FONT_PX) {
                errors.push({
                    line: ln,
                    rule: '字号超限',
                    msg: `font-size 解析为 ${px}px，超过上限 ${MAX_FONT_PX}px（${shown}）`,
                });
            } else if (px >= WARN_FONT_PX) {
                warnings.push({
                    line: ln,
                    rule: '疑似巨型数字',
                    msg: `font-size ${px}px 在上限内但偏大，请复核是否为 KPI 主值（${shown}）`,
                });
            }
        }
    }

    /* --- 检查 2: border-radius --- */
    {
        const re = /border-radius\s*:\s*([^;{}]+)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const rawVal = m[1].trim();
            const resolved = resolveVars(rawVal, vars);
            const ln = reportLine(m.index);
            // border-radius 可以有多个值（四角 / 斜杠），逐个判断
            const parts = splitTopLevel(resolved.replace(/\//g, ' '), ' ');
            for (const part of parts) {
                if (/^50%$/.test(part.trim())) continue; // 圆形，放过
                const px = parsePx(part);
                if (px == null) continue; // 非 px（含 %、其它单位）跳过
                if (px >= PILL_RADIUS_PX) continue; // pill / 胶囊，放过
                if (px > MAX_RADIUS_PX) {
                    const shown = resolved === rawVal ? rawVal : `${rawVal} → ${resolved}`;
                    errors.push({
                        line: ln,
                        rule: '圆角超限',
                        msg: `border-radius 含 ${px}px，超过上限 ${MAX_RADIUS_PX}px（${shown}）`,
                    });
                    break; // 同一声明只报一次
                }
            }
        }
    }

    /* --- 检查 3: box-shadow 模糊半径 --- */
    {
        const re = /box-shadow\s*:\s*([^;{}]+)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const rawVal = m[1].trim();
            if (/^none$/i.test(rawVal)) continue;
            const resolved = resolveVars(rawVal, vars);
            const ln = reportLine(m.index);
            // 多重 shadow，逗号分隔
            const layers = splitTopLevel(resolved, ',');
            for (const layer of layers) {
                const blur = shadowBlurPx(layer);
                if (blur == null) continue; // 解析不确定 → 保守跳过
                if (blur > MAX_SHADOW_BLUR_PX) {
                    const shown = resolved === rawVal ? rawVal : `${rawVal} → ${resolved}`;
                    errors.push({
                        line: ln,
                        rule: '阴影模糊超限',
                        msg: `box-shadow 模糊半径 ${blur}px，超过上限 ${MAX_SHADOW_BLUR_PX}px（${shown}）`,
                    });
                    break; // 同一声明只报一次
                }
            }
        }
    }

    /* --- 检查 4: radial-gradient 光晕铺底 --- */
    {
        const re = /radial-gradient\s*\(/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const ln = reportLine(m.index);
            errors.push({
                line: ln,
                rule: '渐变光晕铺底',
                msg: 'CSS 中出现 radial-gradient(，BI 看板禁止用径向渐变做大面积光晕背景',
            });
        }
    }

    /* --- 检查 5: backdrop-filter 玻璃拟态 --- */
    {
        const re = /backdrop-filter\s*:\s*([^;{}]+)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const val = m[1].trim();
            if (/blur/i.test(val)) {
                const ln = reportLine(m.index);
                errors.push({
                    line: ln,
                    rule: '玻璃拟态',
                    msg: `backdrop-filter 使用了 blur（${val}），BI 看板禁止玻璃拟态效果`,
                });
            }
        }
    }

    /* --- 检查 8: max-width + px（是否有桌面宽度约束） --- */
    {
        const re = /max-width\s*:\s*([^;{}]+)/gi;
        let m;
        while ((m = re.exec(css)) !== null) {
            const resolved = resolveVars(m[1].trim(), vars);
            if (parsePx(resolved) != null) {
                sawMaxWidthPx = true;
            }
        }
    }

    /* --- 检查 7: 三层 token 是否分离（图表色 + 状态色） --- */
    if (ctx.checkTokens) {
        // 图表色 token: --data-1 / --chart-* / --data-cat*
        const hasChartToken = /--data-\d/i.test(css) || /--chart-/i.test(css) || /--data-cat/i.test(css);
        // 状态色 token: --success / --warning / --danger
        const hasStateToken = /--success\b/i.test(css) && /--warning\b/i.test(css) && /--danger\b/i.test(css);
        // 仅当包含 :root（即声明 token 的地方）时才有意义地检查
        const hasRoot = /:root\b/.test(css);
        if (hasRoot && !(hasChartToken && hasStateToken)) {
            const missing = [];
            if (!hasChartToken) missing.push('图表色 token（如 --data-1/--chart-*）');
            if (!hasStateToken) missing.push('状态色 token（--success/--warning/--danger 需同时出现）');
            warnings.push({
                line: null,
                rule: '三层 token 缺失',
                msg: `:root 中缺少 ${missing.join(' 与 ')}，三层 token 可能没有分离`,
            });
        }
    }

    return { errors, warnings, sawMaxWidthPx };
}

/* ----------------------------- 文件级处理 ----------------------------- */

function lintFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const warnings = [];
    let sawMaxWidthPx = false;

    if (ext === '.css') {
        const r = scanCss(raw, 0, { checkTokens: true });
        errors.push(...r.errors);
        warnings.push(...r.warnings);
        sawMaxWidthPx = sawMaxWidthPx || r.sawMaxWidthPx;
    } else if (ext === '.html' || ext === '.htm') {
        const blocks = extractStyleBlocks(raw);
        if (blocks.length === 0) {
            return {
                filePath,
                errors,
                warnings,
                skipped: true,
                reason: '未找到 <style> 块',
            };
        }
        // token 检查在 HTML 里按「合并所有 style 块」判断一次
        const mergedCss = blocks.map((b) => b.css).join('\n');
        blocks.forEach((b) => {
            // <style> 块内行号: 块内是从第 1 行开始，块的第 1 行对应 startLine
            const r = scanCss(b.css, b.startLine - 1, { checkTokens: false });
            errors.push(...r.errors);
            warnings.push(...r.warnings);
            sawMaxWidthPx = sawMaxWidthPx || r.sawMaxWidthPx;
        });
        // 合并后的 token 检查（不带行号）
        const tokenCheck = scanCss(mergedCss, 0, { checkTokens: true });
        warnings.push(...tokenCheck.warnings.filter((w) => w.rule === '三层 token 缺失'));
    } else {
        return {
            filePath,
            errors,
            warnings,
            skipped: true,
            reason: `不支持的文件类型 ${ext}`,
        };
    }

    // 检查 8: 缺少桌面宽度约束（文件级 warning）
    if (MAX_WIDTH_REQUIRED && !sawMaxWidthPx) {
        warnings.push({
            line: null,
            rule: '缺少桌面宽度约束',
            msg: '未发现任何带 px 值的 max-width，可能缺少固定桌面宽度容器',
        });
    }

    return { filePath, errors, warnings, skipped: false };
}

/* ----------------------------- 入口 ----------------------------- */

function collectTargets(args) {
    const files = [];
    const seen = new Set();
    const addFile = (p) => {
        const abs = path.resolve(p);
        if (seen.has(abs)) return;
        const ext = path.extname(abs).toLowerCase();
        if (['.css', '.html', '.htm'].includes(ext)) {
            seen.add(abs);
            files.push(abs);
        }
    };
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue;
            if (entry.name === 'node_modules') continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else addFile(full);
        }
    };

    if (args.length === 0) {
        // 默认目标
        const defaults = [
            'src/styles.css',
            'docs/design/skeleton-workbench.html',
            'docs/design/skeleton-dashboard.html',
        ];
        for (const d of defaults) {
            if (fs.existsSync(d)) addFile(d);
        }
        return files;
    }

    for (const arg of args) {
        if (!fs.existsSync(arg)) {
            console.error(`⚠️  路径不存在，已跳过: ${arg}`);
            continue;
        }
        const stat = fs.statSync(arg);
        if (stat.isDirectory()) walk(arg);
        else addFile(arg);
    }
    return files;
}

function main() {
    const args = process.argv.slice(2);
    const targets = collectTargets(args);

    console.log('═══════════════════════════════════════════════');
    console.log('  设计 lint —— BI 看板硬性视觉约束机械检查');
    console.log('═══════════════════════════════════════════════');

    if (targets.length === 0) {
        console.log('没有可扫描的文件（.css / .html）。');
        process.exit(0);
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const file of targets) {
        const rel = path.relative(process.cwd(), file) || file;
        let result;
        try {
            result = lintFile(file);
        } catch (e) {
            console.log(`\n▶ ${rel}`);
            console.log(`  ✗ 读取/解析失败: ${e.message}`);
            totalErrors++;
            continue;
        }

        console.log(`\n▶ ${rel}`);
        if (result.skipped) {
            console.log(`  · 已跳过（${result.reason}）`);
            continue;
        }

        if (result.errors.length === 0 && result.warnings.length === 0) {
            console.log('  ✓ 通过，无违规');
        }

        for (const e of result.errors) {
            const loc = e.line != null ? `第 ${e.line} 行` : '（文件级）';
            console.log(`  ✗ [error] ${loc} 【${e.rule}】 ${e.msg}`);
        }
        for (const w of result.warnings) {
            const loc = w.line != null ? `第 ${w.line} 行` : '（文件级）';
            console.log(`  ⚠ [warn]  ${loc} 【${w.rule}】 ${w.msg}`);
        }

        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
    }

    console.log('\n───────────────────────────────────────────────');
    console.log(`汇总: ${targets.length} 个文件，error ${totalErrors} 条，warning ${totalWarnings} 条`);
    if (totalErrors > 0) {
        console.log('结果: ✗ 不通过（存在 error）');
        console.log('───────────────────────────────────────────────');
        process.exit(1);
    }
    console.log('结果: ✓ 通过（无 error）');
    console.log('───────────────────────────────────────────────');
    process.exit(0);
}

main();
