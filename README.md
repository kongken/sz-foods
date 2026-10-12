# 深圳美食地图

基于 `sz-foods.xlsx` 生成的纯静态站点(Vite + 原生 JS,无运行时依赖),支持搜索、按区/品类/人均筛选、按评分或价格排序、随机选店和避雷清单。

## 本地开发

```bash
npm install
npm run dev        # 先把 xlsx 转为 src/data/foods.json,再启动开发服务器
npm run build      # 转换数据并构建到 dist/
npm run preview    # 预览构建结果
```

更新数据:替换根目录的 `sz-foods.xlsx`,重新执行 `npm run build` 即可(数据转换逻辑见 `scripts/convert.mjs`)。

## 部署到 Cloudflare Pages

### 方式一:Git 集成(推荐)

1. 把仓库推送到 GitHub / GitLab。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git,选择该仓库。
3. 构建设置:
   - Framework preset: `None`(或 Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - 环境变量(可选): `NODE_VERSION=20`(仓库已含 `.node-version`)
4. Save and Deploy。

### 方式二:命令行直接上传

```bash
npm run build
npx wrangler pages deploy dist --project-name sz-foods
```

## 数据说明

- 每个区一个工作表;「避雷！！！」表单独作为避雷清单;「智能表1」与「龙岗区」重复,已忽略。
- 评分口径不统一(满分 / 90 / 8.5 / 4.5 等),统一折算为 100 分制,悬停评分可看原始值;无法识别的保留原文。
- 第 7 列起的内容视为他人补充评价,折叠展示;纯数字列(如票数)忽略。
- 品类标签由店名、推荐菜、备注中的关键词自动推断,仅供筛选参考。
