# 3D 资产采购 SOP

> 客户大屏需要的 3D 模型（飞机 / 船 / 卡车 / 港口 / 油轮 / 仓库 / 风机 /
> 任意客户业务图标）三条采购路径，模型筛选标准，预处理工具链，以及在
> `settings.assets.*` 中如何引用。本 SOP 内容**对美学库重塑后依然适用**
> （3D 资产采购流程与具体业务行业无关）。
> 配套：[SuperApp Globe 架构](../architecture/towerx-template.md)、
> [客户开发执行 SOP](./build-with-towerx.md) 步骤 4。

---

## 1. 三条路径并列

三条路径不分优劣，按客户场景与预算选用。一个项目里可以混用（背景陪衬走 AI 文生，主视觉走外包）。

### 路径 1 · 模型社区（推荐多数场景）

**来源**：

| 源站 | 链接 | 收费 | 备注 |
|---|---|---|---|
| Sketchfab | https://sketchfab.com | 免费 / 付费混合 | 量最大，按 CC 协议过滤可商用 |
| Quaternius | https://quaternius.com | 免费（CC0）| 低多边形风格化，适合大屏陪衬 |
| Poly Pizza | https://poly.pizza | 免费 | Google Poly 的存档继承站 |
| glTF Sample Models | https://github.com/KhronosGroup/glTF-Sample-Models | 免费 | Khronos 官方样本，技术参考用 |
| 阿里素材市场 | https://www.guang.com.cn | 付费 | 国内素材，中文检索友好 |
| Three.js Examples | https://threejs.org/examples | 免费 | 示例模型，多为教学品质 |

**适合场景**：
- 常见行业模型（卡车 / 船舶 / 飞机 / 油桶 / 集装箱 / 风机 / 太阳能板）
- 模板内"陪衬性"3D 物体（背景里的港口设施、远景城市轮廓）
- 快速 PoC 验证

**优势**：
- 质量稳定（拓扑干净、UV 合理、纹理嵌入）
- 经常自带骨骼动画 / 关键帧动画
- 多种 LOD（细节层级）可选
- 协议清晰（CC 系列）

### 路径 2 · 美术外包 / 自制

**来源**：
- **外包美术**：单个模型 ¥3-10k，2-5 工作日；猪八戒 / 站酷 / 米画师 / 海外 Upwork / Artstation
- **内部美术**：公司设计部门或客户方美术
- **工具**：Blender（免费）/ Cinema 4D / 3ds Max

**适合场景**：
- 客户场景独特（专属设备、定制车型、地标建筑）
- 品牌定制需求（带 logo / 涂装的飞机 / 集装箱）
- 精度要求高（产品展示级，需要 PBR 材质细节）

**优势**：
- 完全可控（尺寸 / 拓扑 / 顶点数 / UV 布局都按需要定）
- 可复用项目资产，沉淀为客户专属素材库
- 没有版权问题

**注意事项**：
- 给美术明确技术规格（顶点上限、目标格式 glTF 2.0、嵌入纹理、不含骨骼动画时需注明）
- 验收时跑一遍 §3 预处理工具链，确认压缩后仍可用

### 路径 3 · AI 文生 3D 工具

**来源**：

| 工具 | 链接 | 模式 | 备注 |
|---|---|---|---|
| 通义万相 3D | https://tongyi.aliyun.com | 文本 / 图像 → glb | 阿里系，中文 prompt 友好 |
| Meshy | https://meshy.ai | 文本 → glb（PBR 纹理）| 国际主流，质量稳定 |
| DataV 智能资产 | 阿里云 DataV 内嵌 | 行业资产库 + 简单生成 | 与 DataV 大屏直接绑定 |
| 智谱 GLM-3D | https://chatglm.cn | 文本 → 3D | 国产新兴 |
| Tripo3D | https://tripo3d.ai | 图像 → 3D | 单张图生成，速度快 |

**适合场景**：
- 短时间内需要大量"背景陪衬性"3D 物体
- 客户没准备好资产、又不舍得花外包钱的过渡阶段
- 模板设计阶段，先用 AI 生成临时模型验证视觉，后续替换

**工作流**：
1. AI 工具描述输入（中文 prompt 也行）→ 等 10s-2min
2. 拿到 glb 文件 → 跑一遍 §2 筛选标准过滤
3. 跑一遍 §3 预处理工具链优化体积
4. 上传 CDN → 填入 `settings.assets.*`

**注意事项**：
- 通常**未优化**（顶点数随机、纹理未压缩）—— §3 工具链必须跑
- **无动画**（AI 生成的是静态网格，要动画走路径 2）
- **几何精度中等**（远观可用，近看穿帮，做主视觉慎用）
- **协议待确认**（不同 AI 工具对生成物的商用授权条款不同，签客户合同前要核对）

---

## 2. 模型筛选标准（所有路径适用）

无论从哪条路径来的模型，进项目前必须通过以下检查：

| 检查项 | 上限 / 要求 | 不达标后果 |
|---|---|---|
| **文件大小** | ≤ 5 MB | > 5 MB 会拖慢首屏加载 |
| **顶点数** | ≤ 50k | > 50k 在低配设备（客户接待用的笔记本）会掉帧 |
| **纹理** | 嵌入式（base64 内联或 glb 内置）| 外部纹理文件容易丢失 / 跨域 |
| **格式** | 标准 glTF 2.0（`.glb` 或 `.gltf`+`.bin`+纹理）| .fbx / .obj / .max 都不接，需先转换 |
| **协议** | CC0 / CC-BY / 商业授权清晰 | 协议不明的不进项目，法律风险 |

**验证工具**：
- https://gltf-viewer.donmccurdy.com —— 拖入文件就能在线渲染，检查是否有破面 / 缺纹理 / 朝向错误
- https://gltf.report —— 看顶点数、材质数、纹理分辨率，量化诊断

**不通过怎么办**：
- 体积 / 顶点超限 → 跑 §3 工具链压缩
- 格式不对 → Blender 打开导出为 glb
- 协议不明 → 换源，**不要冒险**

---

## 3. 模型预处理工具链

把"刚下载 / 刚生成"的 6 MB+ 原始模型压成 1-2 MB 可上线版本。

```bash
# 安装（一次性）
npm install -g @gltf-transform/cli gltfpack

# 几何 Draco 压缩（典型压缩比 5×）
gltfpack -i input.glb -o step1.glb -cc

# 纹理 KTX2 / WebP 压缩（典型再压 3-5×）
gltf-transform webp step1.glb step2.glb
gltf-transform optimize step2.glb final.glb \
  --texture-compress webp \
  --instance \
  --simplify 0.5      # 顶点简化到 50%（可选，背景模型激进用）

# 验证
gltf-transform inspect final.glb   # 看最终顶点数 / 纹理体积
```

**目标对比**：

| 阶段 | 文件大小 | 顶点数 |
|---|---|---|
| 原始（来自路径 1/2/3）| 6-15 MB | 100k-500k |
| Draco 压缩后 | 1-3 MB | 不变（几何属性压缩，顶点数不变）|
| WebP + simplify 后 | 0.5-2 MB | 30k-80k |

**预算原则**：单个大屏所有 3D 资产总和 ≤ 15 MB（含主视觉地球已经 ~6 MB）。

---

## 4. `settings.assets.*` 字段使用

**`settings.json` 结构约定**（v2.0 起将加入 `assets` 字段；当前 v1.0 仅有 `name / title / page`）：

```json
{
    "$schema": "./settings.schema.json",
    "assets": {
        "baseUrl": "https://cdn.客户域名.com/towerx/2026-q2/",
        "ships": "ships.glb",
        "planes": "planes.glb",
        "trucks": "trucks.glb",
        "warehouse": "warehouse.glb"
    }
}
```

**字段语义**：
- `baseUrl`：CDN / OSS 资产根地址。客户切换 CDN（自建 → 阿里云 OSS → 客户内网）时**只改这一个字段**。
- `ships` / `planes` / 其余：相对 `baseUrl` 的路径片段。代码内部用 `new URL(path, baseUrl).toString()` 拼接。

**为什么 `baseUrl` 单独抽出**：
- 客户私有化部署常见诉求："资产不能走公网 CDN，必须放在客户内网"——这时只改 `baseUrl` 一行。
- 多环境（dev / staging / prod）切换时，环境差异收敛在 `baseUrl`。

**代码侧消费模式**（v2.0 接入前的 mental model）：

```ts
// 伪代码示意，v1.0 实际还没有这一层
import { useAppSettings } from '@/services/settings';

function buildAssetUrl(filename: string, settings: AppSettings): string {
    const base = settings.assets?.baseUrl ?? '/assets/';
    return new URL(filename, base).toString();
}
```

**与 [`settings.schema.json`](../../public/settings.schema.json) 的关系**：
- v2.0 起 `settings.schema.json` 需要补 `assets` 字段定义，包含 `baseUrl`（uri-format）+ 各资产路径（string）。
- 提示性建议：在 schema 里给 `ships / planes / trucks` 等字段加 `description` 注明对应的客户场景（"海运" / "空运" / "陆运"），编辑 settings.json 时 IDE 能弹出语义说明。

---

## 索引

- 步骤 4 中如何启用本 SOP：[build-with-towerx.md § 步骤 4](./build-with-towerx.md#步骤-4--模型资产准备按-3d-asset-sourcingmd-sop)
- L2 地图主视觉 / D 数据来源单元格：[towerx-template.md § 矩阵](../architecture/towerx-template.md#矩阵5-层--4-状态)
- 设计豁免（与本 SOP 无直接交叉，但 3D 资产承接相同的视觉立场）：[ADR-001](../design/ADR-001-towerx-large-screen-exemption.md)
