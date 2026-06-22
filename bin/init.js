#!/usr/bin/env node
/**
 * superapp-globe-init
 * 把包内 templates/ 的 settings.json + settings.schema.json
 * 拷贝到消费者项目的 public/ 目录。
 *
 * 用法:
 *   npx superapp-globe-init          # 已存在则跳过
 *   npx superapp-globe-init --force  # 强制覆盖
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const templatesDir = join(pkgRoot, 'templates');

const force = process.argv.includes('--force');
const cwd = process.cwd();
const targetDir = join(cwd, 'public');

const files = ['settings.json', 'settings.schema.json'];

if (!existsSync(templatesDir)) {
    console.error(`[superapp-globe-init] 找不到模板目录: ${templatesDir}`);
    process.exit(1);
}

if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    console.log(`[superapp-globe-init] 创建目录 ${targetDir}`);
}

let copied = 0;
let skipped = 0;
for (const f of files) {
    const src = join(templatesDir, f);
    const dest = join(targetDir, f);
    if (!existsSync(src)) {
        console.warn(`[superapp-globe-init] 跳过(模板缺失): ${f}`);
        continue;
    }
    if (existsSync(dest) && !force) {
        console.log(`[superapp-globe-init] 已存在,跳过: public/${f}(用 --force 覆盖)`);
        skipped++;
        continue;
    }
    copyFileSync(src, dest);
    console.log(`[superapp-globe-init] 写入: public/${f}`);
    copied++;
}

console.log(`[superapp-globe-init] 完成。拷贝 ${copied} 个,跳过 ${skipped} 个。`);
console.log('下一步:在 App.tsx 用 import { TowerXApp } from "@guandata/superapp-globe" 渲染,并 import 其 /styles。');
