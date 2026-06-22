import type { WebGLGlobeConfig } from '../webglConfig';
import { ColorInput, Section, Slider, Subsection, Toggle } from './GlobeEditorControls';

type UpdateConfig = <K extends keyof WebGLGlobeConfig>(key: K, value: WebGLGlobeConfig[K]) => void;

type Props = {
  config: WebGLGlobeConfig;
  update: UpdateConfig;
};

export function GlobeEditorAtmosphereSections({ config, update }: Props) {
  return (
    <>
        <Section label="大气">
          <Subsection label="光晕">
            <Toggle
              label="启用光晕"
              value={config.haloEnabled}
              onChange={(v) => update('haloEnabled', v)}
            />
            <Slider
              label="大小"
              value={config.haloSize}
              min={1}
              max={12}
              step={0.1}
              onChange={(v) => update('haloSize', v)}
            />
            <Slider
              label="亮度"
              value={config.haloIntensity}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => update('haloIntensity', v)}
            />
            <Slider
              label="衰减"
              value={config.haloFalloff}
              min={0.5}
              max={8}
              step={0.1}
              onChange={(v) => update('haloFalloff', v)}
            />
            <ColorInput
              label="内圈颜色"
              value={config.haloInnerColor}
              onChange={(v) => update('haloInnerColor', v)}
            />
            <ColorInput
              label="外圈颜色"
              value={config.haloOuterColor}
              onChange={(v) => update('haloOuterColor', v)}
            />
          </Subsection>

          <Subsection label="粒子">
            <Toggle
              label="启用粒子"
              value={config.particlesEnabled}
              onChange={(v) => update('particlesEnabled', v)}
            />
            <Slider
              label="数量"
              value={config.particleCount}
              min={100}
              max={12000}
              step={50}
              onChange={(v) => update('particleCount', Math.round(v))}
            />
            <ColorInput
              label="颜色"
              value={config.particleColor}
              onChange={(v) => update('particleColor', v)}
            />
            <Slider
              label="透明度"
              value={config.particleOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update('particleOpacity', v)}
            />
            <Slider
              label="内层半径"
              value={config.particleInnerRadius}
              min={1}
              max={3}
              step={0.01}
              onChange={(v) => update('particleInnerRadius', v)}
            />
            <Slider
              label="外层半径"
              value={config.particleOuterRadius}
              min={1.05}
              max={8}
              step={0.05}
              onChange={(v) => update('particleOuterRadius', v)}
            />
            <Slider
              label="旋转速度"
              value={config.particleSpeed}
              min={-0.2}
              max={0.2}
              step={0.005}
              onChange={(v) => update('particleSpeed', v)}
            />
            <Slider
              label="点尺寸"
              value={config.particleSize}
              min={0.002}
              max={0.15}
              step={0.001}
              onChange={(v) => update('particleSize', v)}
            />
            <Slider
              label="密度衰减"
              value={config.particleFalloff}
              min={0.5}
              max={3.5}
              step={0.05}
              onChange={(v) => update('particleFalloff', v)}
            />
            <Slider
              label="闪烁"
              value={config.particleTwinkle}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update('particleTwinkle', v)}
            />
            <Slider
              label="轨道倾角"
              value={config.particleTiltDeg}
              min={-90}
              max={90}
              step={1}
              unit="°"
              onChange={(v) => update('particleTiltDeg', v)}
            />
            <Slider
              label="种子"
              value={config.particleSeed}
              min={1}
              max={9999}
              step={1}
              onChange={(v) => update('particleSeed', Math.round(v))}
            />
          </Subsection>
        </Section>

        <Section label="业务节点 (R1)">
          <Toggle
            label="城市点"
            value={config.citiesEnabled}
            onChange={(v) => update('citiesEnabled', v)}
          />
          <Slider
            label="点 - 大小"
            value={config.cityDotSize}
            min={0.004}
            max={0.03}
            step={0.001}
            onChange={(v) => update('cityDotSize', v)}
          />
          <Slider
            label="halo - 外径"
            value={config.cityHaloSize}
            min={0.008}
            max={0.06}
            step={0.001}
            onChange={(v) => update('cityHaloSize', v)}
          />
          <Slider
            label="halo - 透明"
            value={config.cityHaloOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => update('cityHaloOpacity', v)}
          />
          <Toggle
            label="城市 label"
            value={config.cityLabelsEnabled}
            onChange={(v) => update('cityLabelsEnabled', v)}
          />
          <Slider
            label="label - 字号"
            value={config.cityLabelSize}
            min={0.01}
            max={0.08}
            step={0.001}
            onChange={(v) => update('cityLabelSize', v)}
          />
          <Toggle
            label="航线"
            value={config.routesEnabled}
            onChange={(v) => update('routesEnabled', v)}
          />
          <Slider
            label="航线粗细 (px)"
            value={config.routeWidth}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(v) => update('routeWidth', v)}
          />
          <Slider
            label="航线不透明度"
            value={config.routeOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => update('routeOpacity', v)}
          />
          <Slider
            label="Comet 流速"
            value={config.cometSpeed}
            min={0}
            max={1.0}
            step={0.01}
            onChange={(v) => update('cometSpeed', v)}
          />
          <Slider
            label="Comet 透明"
            value={config.cometOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => update('cometOpacity', v)}
          />
          <Toggle
            label="脉冲环"
            value={config.disruptionRingEnabled}
            onChange={(v) => update('disruptionRingEnabled', v)}
          />
          <Slider
            label="脉冲周期 (s)"
            value={config.disruptionRingPulseSec}
            min={0.5}
            max={6}
            step={0.1}
            onChange={(v) => update('disruptionRingPulseSec', v)}
          />
          <Slider
            label="脉冲内圈半径"
            value={config.disruptionRingBaseRadius}
            min={0.004}
            max={0.12}
            step={0.002}
            onChange={(v) => update('disruptionRingBaseRadius', v)}
          />
          <Slider
            label="脉冲最大扩散"
            value={config.disruptionRingMaxScale}
            min={2}
            max={15}
            step={0.25}
            onChange={(v) => update('disruptionRingMaxScale', v)}
          />
          <Slider
            label="脉冲峰值 alpha"
            value={config.disruptionRingPeakOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => update('disruptionRingPeakOpacity', v)}
          />
        </Section>
    </>
  );
}
