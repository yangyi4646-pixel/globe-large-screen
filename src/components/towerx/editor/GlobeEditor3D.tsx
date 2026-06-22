import { useState } from 'react';
import { defaultWebGLConfig, type WebGLGlobeConfig } from '../webglConfig';
import { GlobeEditorAtmosphereSections } from './GlobeEditorAtmosphereSections';
import { GlobeEditorCoreSections } from './GlobeEditorCoreSections';
import { GlobeEditorIntroSections } from './GlobeEditorIntroSections';

/**
 * GlobeEditor3D — right-panel sibling to AlertFeed. Identical glass
 * card framework + slider/toggle widgets as Round 18's canvas
 * GlobeEditor, but bound to the WebGL config schema.
 */
type GlobeEditor3DProps = {
  config: WebGLGlobeConfig;
  onChange: (next: WebGLGlobeConfig) => void;
  onReset: () => void;
  className?: string;
};

export function GlobeEditor3D({ config, onChange, onReset, className = '' }: GlobeEditor3DProps) {
  const update = <K extends keyof WebGLGlobeConfig>(key: K, value: WebGLGlobeConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  // Tri-state visual feedback for the export button so the user can
  // see SOMETHING happened — without this the action looked dead even
  // when the clipboard write succeeded silently (which is exactly the
  // bug that hit in testing). Cleared after 1.5s.
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // 毛玻璃：勿在祖先加 transform/filter/will-change/contain/opacity<1；
  // 勿把 .liquid-glass-strong 的 background 换成渐变（详见 src/index.css）。
  return (
    <section
      className={`liquid-glass-strong relative flex min-h-0 w-full flex-1 flex-col rounded-[1.75rem] px-3 py-6 ${className}`}
      aria-label="球体编辑面板"
    >
      <header className="flex items-center justify-between gap-2 px-3">
        <span
          className="text-[10.5px] uppercase text-white/60"
          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.28em' }}
        >
          GLOBE EDITOR · WEBGL
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const ok = await copyConfigAsDefaults(config);
              setCopyState(ok ? 'copied' : 'failed');
              window.setTimeout(() => setCopyState('idle'), 1500);
            }}
            className="rounded-full px-3 py-1 text-[10px] transition-colors hover:bg-white/5"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.18em',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color:
                copyState === 'copied'
                  ? '#7aa8ff'
                  : copyState === 'failed'
                    ? '#ff7a7a'
                    : 'rgba(255,255,255,0.7)'
            }}
            title="把当前配置复制成 TS 字面量，粘贴回 webglConfig.ts。失败时回退到 console（按 F12 查看）"
          >
            {copyState === 'copied'
              ? '已复制 ✓'
              : copyState === 'failed'
                ? '失败 · 见 console'
                : '复制为默认值'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full px-3 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.18em',
              border: '1px solid rgba(255, 255, 255, 0.18)'
            }}
          >
            重置
          </button>
        </div>
      </header>

      <div className="mt-2 px-3">
        <h2 className="text-lg font-medium tracking-tight text-white">
          球体编辑面板
        </h2>
        <p
          className="mt-1 text-[10px] uppercase text-white/45"
          style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.28em' }}
        >
          实时 · {Object.keys(defaultWebGLConfig).length} 个参数
        </p>
      </div>

      <div
        className="my-4 h-px w-full shrink-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(180, 170, 255, 0.25), transparent)'
        }}
      />

      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pr-2"
        style={{ scrollbarWidth: 'none' }}
      >
        <GlobeEditorCoreSections config={config} update={update} />
        <GlobeEditorAtmosphereSections config={config} update={update} />
        <GlobeEditorIntroSections config={config} update={update} />      </div>

      <footer
        className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10.5px] text-white/55"
        style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.16em' }}
      >
        <span>{Object.keys(defaultWebGLConfig).length} 个参数</span>
        <span className="font-semibold text-white">实时更新</span>
      </footer>
    </section>
  );
}

// Serialise the live config into the exact shape of `defaultWebGLConfig`
// in `webglConfig.ts` so the user can paste-replace and freeze their
// hand-tuned values as the new defaults. Strings get quoted, booleans
// stay raw, numbers trimmed to 4 decimals for stable diffs. Wrapped
// in `export const defaultWebGLConfig: WebGLGlobeConfig = { ... };`
// so the whole block can swap the existing declaration in one paste.
//
// Returns true on successful clipboard write (async or sync path),
// false if both paths failed — caller uses the boolean to drive the
// button's "已复制 ✓" / "失败" toast. Always dumps to console too so
// the data is recoverable when both paths fail (the bug that made
// the user click and see nothing in an earlier round).
async function copyConfigAsDefaults(config: WebGLGlobeConfig): Promise<boolean> {
  const fmt = (v: unknown): string => {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return Number(v.toFixed(4)).toString();
    }
    return JSON.stringify(v);
  };
  const lines = (Object.keys(defaultWebGLConfig) as Array<keyof WebGLGlobeConfig>).map(
    (k) => `  ${k}: ${fmt(config[k])}`
  );
  const code = `export const defaultWebGLConfig: WebGLGlobeConfig = {\n${lines.join(',\n')}\n};\n`;

  // Always log so the data isn't lost if both copy paths fail.
  console.log(code);

  // Primary path: modern async Clipboard API. Requires a secure context
  // (https or localhost) and document focus — both can fail silently.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  // Fallback: hidden textarea + execCommand('copy'). Works in
  // non-secure contexts and across older browsers that don't expose
  // navigator.clipboard. Deprecated but still universally supported.
  try {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
