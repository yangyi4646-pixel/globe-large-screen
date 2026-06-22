import { CityGlow, DarkGlobe, FlowLine, LiquidGlassPanel, ParticleHalo } from '@towerx';
import '@towerx/components/towerx/towerx.css';
import type { GeoArc, GeoPoint } from '@towerx';

/**
 * PrimitivesDemo —— D3.5 / D3.3 验证页面(handoff 要求的"脱 mock-data 单独用例")。
 *
 * 走 ?demo=primitives 进入。不引用任何 mock-data / SuperAppGlobeApp /
 * useTowerXConfig 等业务代码,验证全部原语开箱可用、能独立组装出一座暗夜地球:
 *
 *   <DarkGlobe atmosphere={false} ambient={<ParticleHalo color=... />}>
 *     <CityGlow points={...} />
 *     <FlowLine arcs={...} style="cinematic" />
 *     <FlowLine from={...} to={...} style="disruption" />
 *   </DarkGlobe>
 *   <LiquidGlassPanel>...HUD...</LiquidGlassPanel>
 *
 * D3.3 验证点:`atmosphere={false}` 关掉 DarkGlobe 内置大气,改由 `ambient` slot
 * 注入自定义 `<ParticleHalo color="#7cc6ff">`(青蓝色,与默认蓝紫明显不同便于肉眼
 * 区分)。大气挂在外层 group,**不随地球自转**;且内置已关,不会双渲染。
 *
 * 数据用了几个真实城市(经度在前 [lng, lat])便于人眼校核投影,但任何 GeoPoint /
 * GeoArc 都行。
 *
 * ⚠️ 城市刻意都选在相机可见半球内(相机 lng:30/lat:18 → 视野经度约 [-60, 120]):
 * 伦敦 / 莫斯科 / 伊斯坦布尔 / 迪拜 / 孟买 / 内罗毕。彗星沿球面弧飞行,飞到地球
 * 背面会被正确剔除(看不到);把端点都放正面,才能完整看到光点飞完整条连线。
 * 若把城市铺到全球(如旧版 SF/悉尼/圣保罗),大半条弧在背面,光点大段时间被剔除
 * —— 那是几何遮挡,不是 FlowLine 的 bug。
 */

const CITIES: GeoPoint[] = [
    { id: 'lon', position: [-0.13, 51.5], label: 'London' },
    { id: 'mow', position: [37.6, 55.8], label: 'Moscow' },
    { id: 'ist', position: [28.98, 41.0], label: 'Istanbul' },
    { id: 'dxb', position: [55.3, 25.2], label: 'Dubai' },
    { id: 'bom', position: [72.9, 19.1], label: 'Mumbai' },
    { id: 'nbo', position: [36.8, -1.3], label: 'Nairobi' },
];

const ARCS: GeoArc[] = [
    { id: 'lon-dxb', from: [-0.13, 51.5], to: [55.3, 25.2] },
    { id: 'dxb-bom', from: [55.3, 25.2], to: [72.9, 19.1] },
    { id: 'mow-ist', from: [37.6, 55.8], to: [28.98, 41.0] },
    { id: 'nbo-dxb', from: [36.8, -1.3], to: [55.3, 25.2] },
];

export function PrimitivesDemo() {
    return (
        <>
            <DarkGlobe
                density="dense"
                camera={{ lng: 30, lat: 18, zoom: 0.72 }}
                // 居中(默认 positionX/Y 是为样板右侧 HUD 把球放左下),让整个地球 + 完整弧入画。
                config={{ positionX: 0, positionY: 0 }}
                atmosphere={false}
                ambient={<ParticleHalo color="#7cc6ff" />}
            >
                <CityGlow points={CITIES} />
                <FlowLine arcs={ARCS} style="cinematic" />
                {/* 单线便捷形式 + disruption 品红视觉(伦敦→孟买,跨可见半球) */}
                <FlowLine from={[-0.13, 51.5]} to={[72.9, 19.1]} style="disruption" />
            </DarkGlobe>

            <LiquidGlassPanel
                as="aside"
                style={{
                    position: 'fixed',
                    top: 32,
                    right: 32,
                    padding: '20px 24px',
                    maxWidth: 320,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#eef4ff',
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        fontSize: 10,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.55)',
                        marginBottom: 8,
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                >
                    Primitives Demo · D3.3 / D3.5
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.4, marginBottom: 12 }}>
                    脱 mock-data 用原语装一座暗夜地球
                </div>
                <div
                    style={{
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: 'rgba(255,255,255,0.7)',
                    }}
                >
                    6 个 <code style={{ color: '#dde7ff' }}>{'<CityGlow>'}</code> 点位 +
                    4 条 <code style={{ color: '#dde7ff' }}>cinematic</code> 流光 +
                    1 条 <code style={{ color: '#ffd4e3' }}>disruption</code>(品红)+
                    自定义 <code style={{ color: '#7cc6ff' }}>{'<ParticleHalo>'}</code>(青蓝大气,
                    <code style={{ color: '#dde7ff' }}>atmosphere=&#123;false&#125;</code> 关内置)。
                    无任何业务 import,所有数据由 props 注入。
                </div>
                <div
                    style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                >
                    回主样板 →{' '}
                    <a
                        href="?"
                        style={{ color: '#4d8bff', textDecoration: 'none' }}
                    >
                        /
                    </a>
                </div>
            </LiquidGlassPanel>
        </>
    );
}
