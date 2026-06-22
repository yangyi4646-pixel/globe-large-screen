import type { WebGLGlobeConfig } from '../webglConfig';
import { ColorInput, Section, Slider, Toggle } from './GlobeEditorControls';

type UpdateConfig = <K extends keyof WebGLGlobeConfig>(key: K, value: WebGLGlobeConfig[K]) => void;

type Props = {
  config: WebGLGlobeConfig;
  update: UpdateConfig;
};

export function GlobeEditorCoreSections({ config, update }: Props) {
  return (
    <>
        <Section label="几何">
          <Slider
            label="半径"
            value={config.radius}
            min={0.5}
            max={3.5}
            step={0.05}
            onChange={(v) => update('radius', v)}
          />
          <Slider
            label="X 偏移"
            value={config.positionX}
            min={-3}
            max={3}
            step={0.05}
            onChange={(v) => update('positionX', v)}
          />
          <Slider
            label="Y 偏移"
            value={config.positionY}
            min={-3}
            max={3}
            step={0.05}
            onChange={(v) => update('positionY', v)}
          />
        </Section>

        <Section label="相机">
          <Slider
            label="相机距离"
            value={config.cameraZ}
            min={3}
            max={12}
            step={0.1}
            onChange={(v) => update('cameraZ', v)}
          />
          <Slider
            label="视场角 FOV"
            value={config.cameraFov}
            min={15}
            max={75}
            step={1}
            unit="°"
            onChange={(v) => update('cameraFov', v)}
          />
          <Slider
            label="纬度"
            value={config.cameraLatDeg}
            min={-60}
            max={70}
            step={0.5}
            unit="°"
            onChange={(v) => update('cameraLatDeg', v)}
          />
          <Slider
            label="经度"
            value={config.cameraLngDeg}
            min={-180}
            max={180}
            step={0.5}
            unit="°"
            onChange={(v) => update('cameraLngDeg', v)}
          />
          <Slider
            label="漂移幅度"
            value={config.driftAmplitude}
            min={0}
            max={0.3}
            step={0.005}
            onChange={(v) => update('driftAmplitude', v)}
          />
          <Slider
            label="漂移速度"
            value={config.driftSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('driftSpeed', v)}
          />
        </Section>

        <Section label="陆地与海洋">
          <ColorInput
            label="海洋颜色"
            value={config.oceanColor}
            onChange={(v) => update('oceanColor', v)}
          />
          <Toggle
            label="启用陆地填充"
            value={config.landEnabled}
            onChange={(v) => update('landEnabled', v)}
          />
          <ColorInput
            label="陆地颜色"
            value={config.landColor}
            onChange={(v) => update('landColor', v)}
          />
          <Slider
            label="陆地透明度"
            value={config.landAlpha}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('landAlpha', v)}
          />
        </Section>

        <Section label="国家轮廓">
          <Toggle
            label="启用国家线"
            value={config.countriesEnabled}
            onChange={(v) => update('countriesEnabled', v)}
          />
          <Slider
            label="透明度"
            value={config.countryAlpha}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('countryAlpha', v)}
          />
          <ColorInput
            label="颜色"
            value={config.countryColor}
            onChange={(v) => update('countryColor', v)}
          />
          <Slider
            label="国境线朝向衰减"
            value={config.countryFacingPow}
            min={0}
            max={4}
            step={0.05}
            onChange={(v) => update('countryFacingPow', v)}
          />
        </Section>

        <Section label="深度光照">
          <Slider
            label="明暗衰减强度"
            value={config.limbDarkenStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('limbDarkenStrength', v)}
          />
          <Slider
            label="明暗衰减锐度"
            value={config.limbDarkenPow}
            min={0.2}
            max={5}
            step={0.05}
            onChange={(v) => update('limbDarkenPow', v)}
          />
          <Slider
            label="大气边缘强度"
            value={config.bodyRimStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('bodyRimStrength', v)}
          />
          <Slider
            label="大气边缘宽度"
            value={config.bodyRimWidth}
            min={0.5}
            max={8}
            step={0.05}
            onChange={(v) => update('bodyRimWidth', v)}
          />
          <ColorInput
            label="大气边缘颜色"
            value={config.bodyRimColor}
            onChange={(v) => update('bodyRimColor', v)}
          />
          <Slider
            label="地表点朝向衰减"
            value={config.surfaceDotsFacingPow}
            min={0}
            max={4}
            step={0.05}
            onChange={(v) => update('surfaceDotsFacingPow', v)}
          />
        </Section>

        <Section label="地表呼吸点">
          <Toggle
            label="启用地表点"
            value={config.surfaceDotsEnabled}
            onChange={(v) => update('surfaceDotsEnabled', v)}
          />
          <Toggle
            label="落在陆地上"
            value={config.surfaceDotsTargetLand}
            onChange={(v) => update('surfaceDotsTargetLand', v)}
          />
          <ColorInput
            label="颜色"
            value={config.surfaceDotsColor}
            onChange={(v) => update('surfaceDotsColor', v)}
          />
          <Slider
            label="透明度"
            value={config.surfaceDotsOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('surfaceDotsOpacity', v)}
          />
          <Slider
            label="点尺寸"
            value={config.surfaceDotsSize}
            min={0.005}
            max={0.3}
            step={0.001}
            onChange={(v) => update('surfaceDotsSize', v)}
          />
          <Slider
            label="密度"
            value={config.surfaceDotsDensity}
            min={0.3}
            max={10}
            step={0.05}
            onChange={(v) => update('surfaceDotsDensity', v)}
          />
          <Slider
            label="海岸缓冲"
            value={config.surfaceDotsCoastBuffer}
            min={0}
            max={0.05}
            step={0.0005}
            onChange={(v) => update('surfaceDotsCoastBuffer', v)}
          />
          <Slider
            label="保留率"
            value={config.surfaceDotsThinning}
            min={0.05}
            max={1}
            step={0.01}
            onChange={(v) => update('surfaceDotsThinning', v)}
          />
          <Slider
            label="呼吸幅度"
            value={config.surfaceDotsBreathe}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('surfaceDotsBreathe', v)}
          />
          <Slider
            label="呼吸频率"
            value={config.surfaceDotsBreathSpeed}
            min={0.02}
            max={3}
            step={0.01}
            onChange={(v) => update('surfaceDotsBreathSpeed', v)}
            unit="Hz"
          />
          <Slider
            label="团块尺寸"
            value={config.surfaceDotsClusterScale}
            min={0.5}
            max={8}
            step={0.05}
            onChange={(v) => update('surfaceDotsClusterScale', v)}
          />
          <Slider
            label="团块锐度"
            value={config.surfaceDotsClusterSharp}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('surfaceDotsClusterSharp', v)}
          />
          <Slider
            label="种子"
            value={config.surfaceDotsSeed}
            min={1}
            max={9999}
            step={1}
            onChange={(v) => update('surfaceDotsSeed', Math.round(v))}
          />
        </Section>
    </>
  );
}
