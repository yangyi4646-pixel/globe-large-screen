# 卡片 API 说明

这份文档只保留 API card 自渲染时最关键的输入、返回结构和读取方式。过滤条件统一体现在 `filters` 参数里。

## 核心结论

- 先调 `getCardInfo(cardId)`，确认 `content.chartType`
- 页面侧先按 `chartType` 判断渲染形态，不要只凭 `row/column/data` 猜是柱状图还是折线图
- 再调 `getStandardCardData(cardId, params)`，它返回的是 `/api/card/:id/data` 里的 `chartMain`
- 表格卡不要只按一种结构理解，要根据接口返回结构区分“普通表格”还是“透视表格”
- 普通表格重点看 `row.fields + row.data + count`
- 透视表格重点看 `row.fields + column.fields + column.data + data[][]`
- 图表卡重点看 `row.data + column.data + data[][]`

## 请求参数

```ts
type IGetCardDataParams = {
    filters?: Array<IFieldFilter>;
    dynamicParams?: Array<{
        dpId: string;
        name: string;
        valueType: BIDynamicParamType;
        defaultValue: string;
    }>;
    drillFilters?: Array<Omit<IFieldFilter, 'filterLevel'>>;
};
```

- `filters`：过滤条件
- 需要联动时，把当前业务条件转换成 `filter[]` 后作为 `filters` 传入
- `dynamicParams`：动态参数
- `drillFilters`：下钻条件

`filter` 的结构见 [`card-filter.md`](./card-filter.md)。

当前仓库里，`src/bi-services/card.ts` 已导出 `IFieldFilter`，可直接复用：

```ts
type IFieldFilter = BIField & {
    filterLevel: BIFilterLevel;
    filterType: BIFilterType;
    filterValue: string[];
    displayValue?: string[];
};
```

## 标准返回结构

```ts
type IStandardCardData = {
    data: IDataValue[][];
    row: {
        data: IDimensionValue[][];
        fields: (IField | MPH)[];
    };
    column: {
        data: IColumnDatumByCol[];
        fields: (IField | MPH)[];
    };
    count?: number;
    meta?: Record<string, any>;
    limitInfo: any;
};
```

关键字段：

- `row.fields`：行区字段定义
- `row.data`：行区维度值
- `column.fields`：列区字段定义，透视表格场景尤其重要
- `column.data`：系列名或列区展开值
- `data[rowIndex][columnIndex]`：真实数值
- `count`：结果总数，表格场景最常用

## 表格卡

### 先根据接口返回结构判断是哪种表格

- 如果 `column.data` 为空，或者没有右侧列区展开，按“普通表格”读取
- 如果 `column.data` 非空，且 `data[rowIndex][columnIndex]` 需要和列区表头一起解释，按“透视表格”读取
- 不要依赖卡片名称或业务命名去猜表格类型

### 普通表格

读取重点：

- `row.fields`：表头
- `row.data`：行数据
- `count`：总行数

```ts
const columns = chartMain.row.fields.map((field) => field.title);
const rows = chartMain.row.data;
const total = chartMain.count ?? 0;
```

### 透视表格

读取重点：

- `row.fields`：左侧行维度表头
- `row.data`：左侧行维度值
- `column.fields`：列区定义，例如 `年 / 度量名`
- `column.data`：展开后的多级列表头，例如 `2019/中单数`
- `data[rowIndex][columnIndex]`：透视表每个单元格的真实值

这类场景如果只读取 `row.fields + row.data`，会丢掉右侧展开列和指标矩阵，渲染结果就会不完整。

## Meta 和标准数据

这里说的 Meta，统一指 `getCardInfo(cardId).content.meta.chartMain`。

- `getCardInfo(...).content.meta.chartMain` 解决“这张卡怎么配的”
- `getStandardCardData(...)` 解决“这张卡返回了什么数据”
- 如果要把 BI 图表渲染交给开放图表 iframe，完整协议、`chartType`、zone spec 和 `zoneData` 类型见 [`open-chart.md`](./open-chart.md)

最常见的对照关系：

- `meta.chartMain.zoneData.row` 对应标准数据里的 `row.fields + row.data`
- `meta.chartMain.zoneData.column` 对应标准数据里的 `column.fields + column.data`
- `meta.chartMain.zoneData.metric` 对应标准数据里每一列度量的定义，以及 `data[][]` 里的实际值

## 案例：`m1dc48db5d68046adb84d5f4`

这个案例取自卡片 `m1dc48db5d68046adb84d5f4` 的真实返回。它虽然是一张透视表，但很适合用来解释 `meta` 和标准结构的对应关系。

### 先看 `getCardInfo(...)` 里的 Meta

```ts
const cardInfo = await getCardInfo('m1dc48db5d68046adb84d5f4');

{
    content: {
        chartType: 'PIVOT_TABLE', // 先确定卡片类型，这里是透视表
        meta: {
            chartMain: {
                zoneData: {
                    row: [
                        {
                            fdId: 'x129a9d29c0004345981ecd4',
                            name: '营运中心',
                            fdType: 'STRING',
                            key: 'yjKWpFnkKJYllGiWoozvBtXK',
                        }, // 左侧第一层行维度
                        {
                            fdId: 't8cc6db0e2f7847f2bcea9b0',
                            name: '年龄段',
                            fdType: 'STRING',
                            key: 'XKusvhdVENzhvfYXyZyJlcRM',
                        }, // 左侧第二层行维度
                    ],
                    column: [
                        {
                            fdId: 'p2d56aee1f1fe4404abc19a5',
                            name: '年',
                            fdType: 'LONG',
                            metaType: 'METRIC',
                            key: 'StZsZsfRWXhpzRHzNjsgpmNX',
                        }, // 顶部列维度
                        {
                            name: '度量名',
                            metaType: 'MPH',
                            key: 'NAnSCUuWDJyyckPauhFjtkxD',
                        }, // 系统补出的度量占位列
                    ],
                    metric: [
                        {
                            fdId: 'b6f451b0fa3bc4ef3a5de2c6',
                            name: '中单数',
                            fdType: 'LONG',
                            aggrType: 'SUM',
                            key: 'AWqDxRBAEpdDKyZcPRnOVIGL',
                        }, // 第一个指标
                        {
                            fdId: 'ja11d7bd87dbc42c8ad55315',
                            name: '最终接单量',
                            fdType: 'LONG',
                            aggrType: 'SUM',
                            key: 'jVuiyQxLFrXuWQFECXQfkDPg',
                        }, // 第二个指标
                    ],
                },
                props: {
                    // 图表/透视表的属性配置，真实返回里还有更多展示属性
                },
            },
        },
    },
}
```

从这段 Meta 就能直接看出：

- 行区放了 `营运中心`、`年龄段`
- 列区放了 `年` 和系统补出来的 `度量名`
- 指标区放了 `中单数`、`最终接单量`

### 再看 `getStandardCardData(...)` 的真实结构

```ts
{
    chartMain: {
        row: {
            fields: [
                { fdId: 'x129a9d29c0004345981ecd4', title: '营运中心' }, // 对应 Meta 里的 row[0]
                { fdId: 't8cc6db0e2f7847f2bcea9b0', title: '年龄段' }, // 对应 Meta 里的 row[1]
            ],
            data: [
                [
                    { title: '成人', titleType: 'STRING' }, // 第一行第一层维度值
                    { title: '10-27', titleType: 'STRING' }, // 第一行第二层维度值
                ],
                [
                    { title: '成人', titleType: 'STRING' },
                    { title: '10-21', titleType: 'STRING' },
                ],
            ],
        },
        column: {
            fields: [
                { fdId: 'p2d56aee1f1fe4404abc19a5', title: '年' }, // 对应 Meta 里的 column[0]
                { title: '度量名', isMPH: true }, // 对应 Meta 里的 column[1]
            ],
            data: [
                [
                    { title: '2019', titleType: 'LONG' }, // 顶部列区值
                    { title: '中单数', fdId: 'b6f451b0fa3bc4ef3a5de2c6', type: 'metric' }, // 对应 Meta 里的 metric[0]
                ],
                [
                    { title: '2019', titleType: 'LONG' },
                    { title: '最终接单量', fdId: 'ja11d7bd87dbc42c8ad55315', type: 'metric' }, // 对应 Meta 里的 metric[1]
                ],
            ],
        },
        data: [
            [{ v: 95 }, { v: 76212 }, null, null], // 第一行对应 2019/中单数、2019/最终接单量、2020/中单数、2020/最终接单量
            [{ v: 117 }, { v: 54928 }, null, null],
        ],
        count: 74, // 总行数
        limitInfo: {
            dataLimit: 31000,
            colLimit: 100,
            hasMoreData: false,
            hasMoreCol: false,
        },
    },
}
```

把 Meta 和数据结构对起来看：

- `Meta.zoneData.row[0] = 营运中心`，所以 `row.fields[0]` 是 `营运中心`
- `Meta.zoneData.metric[0] = 中单数`，所以 `column.data[0][1]` 是 `中单数`
- 第一条数据里 `row.data[0] = ['成人', '10-27']`
- 同一行里 `data[0][0] = 95`、`data[0][1] = 76212`
- 这就能还原出“成人 / 10-27”这一行在 `2019` 年下的两个指标值

## 图表卡

### 先判断 `chartType`

- 页面层不要只看数据长相就猜图表类型
- 先看 `getCardInfo(cardId).content.chartType`
- 根据 `chartType` 选择匹配的渲染形态，例如折线图、柱状图等

### 读取重点

- `row.data`：X 轴类目
- `column.data`：系列名
- `data[rowIndex][columnIndex].v`：数值
- `getCardInfo(cardId).content.meta.chartMain`：图表的字段配置和图形属性

```ts
const labels = chartMain.row.data.map((row) => row[0]?.title || '-');
const series = chartMain.column.data.map((metricGroup, columnIndex) => ({
    label: metricGroup[0]?.title || `系列 ${columnIndex + 1}`,
    values: chartMain.data.map((row) => Number(row[columnIndex]?.v || 0)),
}));
```

图表类型的最终判断以 `chartType` 为准，不要在页面侧凭数据结构猜图形样式。

## 最小流程

1. 调 `getCardInfo(cardId)` 判断 `chartType`
2. 结合 `content.meta.chartMain` 看字段是怎么落在 row / column / metric 上的
3. 调 `getStandardCardData(cardId, params)` 拿 `chartMain`
4. 先读 `row / column / data`
5. 如果有外部业务条件，先把它转换成 `filters`
6. 根据 `chartMain` 的返回结构判断是普通表格、透视表格还是图表，再在 `src/services/` 做对应 view model 整形
7. 页面层只负责渲染和条件状态
