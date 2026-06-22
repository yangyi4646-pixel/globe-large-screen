import { restartIntro } from '../intro/introClock';
import type { WebGLGlobeConfig } from '../webglConfig';
import { Section, Slider, Subsection, Toggle } from './GlobeEditorControls';

type UpdateConfig = <K extends keyof WebGLGlobeConfig>(key: K, value: WebGLGlobeConfig[K]) => void;

type Props = {
  config: WebGLGlobeConfig;
  update: UpdateConfig;
};

export function GlobeEditorIntroSections({ config, update }: Props) {
  return (
    <>
        <Section label="开场动画">
          <button
            type="button"
            onClick={() => restartIntro()}
            className="mb-1 w-full rounded-full bg-white/10 px-3 py-2 text-[11px] text-white/85 transition-colors hover:bg-white/15"
            style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.16em' }}
          >
            ▶ 重新播放
          </button>
          <Toggle
            label="启用开场"
            value={config.introEnabled}
            onChange={(v) => update('introEnabled', v)}
          />
          <Subsection label="节奏 / 地球">
            <Slider
              label="播放速率 ×"
              value={config.introSpeed}
              min={0.3}
              max={2.5}
              step={0.05}
              onChange={(v) => update('introSpeed', v)}
            />
            <Slider
              label="起始缩放 (远→近)"
              value={config.introEmergeFrom}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(v) => update('introEmergeFrom', v)}
            />
            <Slider
              label="生长时长 (ms)"
              value={config.introEmergeMs}
              min={400}
              max={6000}
              step={50}
              onChange={(v) => update('introEmergeMs', v)}
            />
            <Slider
              label="旋入角 (rad)"
              value={config.introSpinRad}
              min={0}
              max={3}
              step={0.05}
              onChange={(v) => update('introSpinRad', v)}
            />
            <Slider
              label="点亮强度 × (1=关)"
              value={config.introIgnite}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) => update('introIgnite', v)}
            />
            <Slider
              label="裸球淡入 (ms)"
              value={config.introBodyMs}
              min={200}
              max={4000}
              step={50}
              onChange={(v) => update('introBodyMs', v)}
            />
            <Slider
              label="行进起 (ms)"
              value={config.introTravelStartMs}
              min={0}
              max={4000}
              step={50}
              onChange={(v) => update('introTravelStartMs', v)}
            />
            <Slider
              label="行进止 (ms)"
              value={config.introTravelEndMs}
              min={400}
              max={6000}
              step={50}
              onChange={(v) => update('introTravelEndMs', v)}
            />
          </Subsection>
          <Subsection label="分层渐入">
            <Slider
              label="分层淡入时长 (ms)"
              value={config.introLayerFadeMs}
              min={150}
              max={2000}
              step={25}
              onChange={(v) => update('introLayerFadeMs', v)}
            />
            <Slider
              label="点阵起 (ms)"
              value={config.introDotsStartMs}
              min={0}
              max={5000}
              step={50}
              onChange={(v) => update('introDotsStartMs', v)}
            />
            <Slider
              label="国境线起 (ms)"
              value={config.introLinesStartMs}
              min={0}
              max={5000}
              step={50}
              onChange={(v) => update('introLinesStartMs', v)}
            />
            <Slider
              label="大气起 (ms)"
              value={config.introAtmoStartMs}
              min={0}
              max={5000}
              step={50}
              onChange={(v) => update('introAtmoStartMs', v)}
            />
            <Slider
              label="城市起 (ms)"
              value={config.introCityStartMs}
              min={0}
              max={6000}
              step={50}
              onChange={(v) => update('introCityStartMs', v)}
            />
            <Slider
              label="航线起 (ms)"
              value={config.introRouteStartMs}
              min={0}
              max={6000}
              step={50}
              onChange={(v) => update('introRouteStartMs', v)}
            />
          </Subsection>
        </Section>

        <Section label="标题">
          <Slider
            label="字号 (px)"
            value={config.titleFontPx}
            min={32}
            max={160}
            step={1}
            onChange={(v) => update('titleFontPx', v)}
          />
          <Slider
            label="行间距 (px)"
            value={config.titleLineGap}
            min={-40}
            max={80}
            step={1}
            onChange={(v) => update('titleLineGap', v)}
          />
        </Section>

        <Section label="后期 Bloom">
          <Toggle
            label="启用 Bloom"
            value={config.bloomEnabled}
            onChange={(v) => update('bloomEnabled', v)}
          />
          <Slider
            label="强度"
            value={config.bloomIntensity}
            min={0}
            max={2.5}
            step={0.05}
            onChange={(v) => update('bloomIntensity', v)}
          />
          <Slider
            label="亮度阈值"
            value={config.bloomLuminanceThreshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('bloomLuminanceThreshold', v)}
          />
        </Section>
    </>
  );
}
