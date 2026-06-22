# 开放图表说明

这份文档说明 BI 开放图表的接入协议、类型定义和样式调整方式。开发时优先复用 `src/core/open-chart.ts` 与 `src/core/chart-meta.ts` 中提供的封装。

## 核心结论

- 开放图表 iframe 路由是 `/unauth/open/chart?id=<channelId>`。
- 这里的 `id` 是父子页面通信的信道 ID，不是 BI card id。当前工程直接用 card id 作为信道 ID，便于排查。
- iframe 不会根据 card id 自动查数。父页面必须先调用 `getCardInfo(cardId)` 和 `getStandardCardData(cardId, {})`，再把 `chartData`、`chartMeta`、`chartType` 通过 `postMessage` 发给 iframe。
- `chartMeta` 对应 `getCardInfo(cardId).content.meta`，其中图表配置入口是 `chartMeta.chartMain`。
- `chartType` 直接使用 `getCardInfo(cardId).content.chartType`。不同 BI 版本支持的渲染类型可能不同，不适配的类型会由开放图表容器自行回退展示。

## 当前工程里的封装

- `src/core/open-chart.ts`
  - `getOpenChartUrl(channelId)`：生成 iframe URL。
  - `buildOpenChartPayload(channelId, cardInfo, chartData)`：生成父页面发给 iframe 的数据。
  - `OPEN_CHART_READY_EVENT` / `OPEN_CHART_DATA_EVENT` / `OPEN_CHART_EVENT`：开放图表事件名。
- `src/core/chart-meta.ts`
  - 统一导出开放图表相关类型和 helper，便于业务代码只从一个入口引用。
- `src/core/chart-types.ts`
  - `ChartType`：BI 图表类型常量。
  - `ZoneType`：`zoneData` 的稳定 key。
  - `OpenChartMeta` / `ZoneData` / `MetricZoneField` 等图表 meta 类型。
- `src/core/chart-props.ts`
  - `ChartProps`：`chartMeta.chartMain.props` 的样式配置类型。
- `src/core/chart-zone-spec.ts`
  - `getZoneSpecArrayByChartType(...)` / `getZoneIndexedValidationSpecByChartType(...)`：读取图表类型对应的 zone 数量与字段校验规则。
  - `getCompatibleChartTypesByZoneData(...)` / `getCardCompatibleChartTypes(...)`：根据当前卡片 `zoneData` 获取字段结构完全兼容的图表类型。
  - `getCardZoneData(...)` / `getCardZoneFields(...)`：按 zone 读取当前卡片字段配置。

## postMessage 协议

父页面发送数据：

```ts
type OpenChartDataPayload = {
    id: string;
    type: 'gd-open-chart-data';
    chartData: IStandardCardData;
    chartMeta: OpenChartMeta;
    chartType: string;
    metrics: Array<{
        id: string;
        format?: BIFieldNumberFormat;
    }>;
};
```

iframe 就绪事件：

```ts
{
    id: string;
    type: 'gd-open-chart-ready';
}
```

iframe 回传事件：

```ts
{
    id: string;
    type: 'gd-open-chart-event';
    payload:
        | { name: 'TableHeightChange'; tableHeight: number }
        | { name: 'TableDataParamsChange'; parameters: unknown }
        | { name: 'Error'; errorMessage?: string };
}
```

父页面控制主题：

```ts
iframe.contentWindow?.postMessage(
    {
        id,
        type: 'gd-open-chart-event',
        payload: { name: 'ChangeTheme', theme: 'LIGHT' },
    },
    targetOrigin,
);
```

## chartType

`chartType` 来自 `getCardInfo(cardId).content.chartType`。它表示当前卡片保存时使用的图表类型，例如 `BASIC_COLUMN`、`PIVOT_TABLE`、`PIE`。

如果要在不改字段配置的前提下切换图表类型，先用 `zoneData` 校验当前字段结构可兼容哪些类型。推荐写法：

```ts
import { getCardCompatibleChartTypes } from '@/core/chart-meta';

const compatibleChartTypes = getCardCompatibleChartTypes(cardInfo);
```

`getCardCompatibleChartTypes(...)` 会同时检查：

- 当前 `zoneData` 是否只使用目标图表支持的 zone
- 每个 zone 的字段数量是否满足 `minCount` / `maxCount`
- 每个 zone 内字段类型是否满足目标图表的校验规则，例如维度区只能放维度字段、指标区只能放指标字段

如果只是使用开放图表渲染当前卡片，不需要提前判断渲染兼容性；直接把原始 `chartType` 传给开放图表容器即可。

## zoneData

`zoneData` 是“这张卡怎么配置字段”的核心结构，路径为：

```ts
const zoneData = cardInfo.content.meta.chartMain.zoneData;
```

稳定 zone key：

| key | 含义 |
| --- | --- |
| `row` | 行/维度区 |
| `column` | 列/对比区 |
| `metric` | 主指标区 |
| `metric_additional` | 附加指标区 |
| `filters` | 筛选区 |
| `sorting` | 排序区 |
| `colorBy` | 颜色区 |
| `sizeBy` | 大小区 |
| `tooltip` | 提示区 |
| `split` | 拆分区 |

读取示例：

```ts
import { getCardZoneFields, ZoneType } from '@/core/chart-meta';

const rowFields = getCardZoneFields(cardInfo, ZoneType.ROW);
const metricFields = getCardZoneFields(cardInfo, ZoneType.METRIC);
const colorByFields = getCardZoneFields(cardInfo, ZoneType.COLOR_BY);
```

字段常见属性：

```ts
type BaseZoneField = {
    id?: string;
    key?: string;
    fdId?: string;
    name?: string;
    title?: string;
    alias?: string;
    fdType?: BIFieldType;
    granularity?: BIGranularity;
    fieldFormat?: {
        numberFormat?: BIFieldNumberFormat;
        headerFormat?: unknown;
        conditionFormat?: unknown;
        itemSetting?: unknown;
    };
};
```

### zone spec

当前工程提供与图表类型对应的 zone 规则：

```ts
import {
    getCardCompatibleChartTypes,
    getZoneIndexedValidationSpecByChartType,
    getZoneSpecArrayByChartType,
} from '@/core/chart-meta';

const zoneSpecs = getZoneSpecArrayByChartType('BASIC_COLUMN');
const validationSpecs = getZoneIndexedValidationSpecByChartType('BASIC_COLUMN');
const compatibleChartTypes = getCardCompatibleChartTypes(cardInfo);
```

`zoneSpecs` 描述每个图表类型支持哪些 zone，以及每个 zone 的字段数量限制。`validationSpecs` 描述每个 zone 可以放维度字段、指标字段，还是两者都可以。

## 修改图表样式

样式修改主要落在：

```ts
cardInfo.content.meta.chartMain.props
```

`ChartProps` 定义在 `src/core/chart-props.ts`，并通过 `src/core/chart-meta.ts` 统一导出。常见样式字段：

- 通用：`themeColor`、`axes`、`chartLegend`、`tooltip`、`dataLabels`
- 柱/条：`miscBarSetting`
- 折线/面积：`miscLineSetting`
- 饼图/旭日图：`pieSetting`、`centerTextSetting`
- 表格：`pivot_appearance`、`miscPivotTableSetting`、`grandTotal`
- KPI：`singleValueSetting`、`mainKpiSetting`、`secondKpiSetting`
- 地图：`highmapSetting`、`baiduMapSetting`
- 热力图：`heatMapSetting`

修改时不要直接改接口返回对象本身，推荐复制后再改：

```ts
import type { OpenChartMeta } from '@/core/chart-meta';

function withHiddenLegend(chartMeta: OpenChartMeta): OpenChartMeta {
    return {
        ...chartMeta,
        chartMain: {
            ...chartMeta.chartMain,
            props: {
                ...chartMeta.chartMain.props,
                chartLegend: {
                    ...(chartMeta.chartMain.props?.chartLegend as Record<string, unknown> | undefined),
                    showLegend: false,
                },
            },
        },
    };
}
```

## 样式调整流程

调整图表展示样式时，建议流程是：

1. 调 `getCardInfo(cardId)` 获取 `chartType`、`zoneData` 和 `chartMeta.chartMain.props`。
2. 如需切换图表类型，先用 `getCardCompatibleChartTypes(cardInfo)` 获取字段结构完全兼容的目标类型。
3. 用 `getCardZoneFields(...)` 读取 `row`、`metric`、`colorBy` 等字段，避免凭字段名猜结构。
4. 只修改 `chartMeta.chartMain.props`，再重新调用 `buildOpenChartPayload(...)` 发送给 iframe。

不要修改 `zoneData` 来实现视觉样式。`zoneData` 表示字段拖拽和计算配置，错误修改可能导致图表无法渲染或数据解释错误。
