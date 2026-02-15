# 🎨 年轻版设计系统应用说明

## ✅ 已应用的年轻版设计系统规范

### 1. 核心设计原则

| 规则 | 应用 | 代码示例 |
|------|------|---------|
| **直角设计** | ✅ 所有容器使用直角 | `border-radius: var(--yds-radius-none)` (0px) |
| **无阴影** | ✅ 扁平化设计 | `box-shadow: none` |
| **黑色按钮** | ✅ 默认使用黑色主按钮 | `background-color: var(--yds-color-neutral-black)` |
| **YDS 变量** | ✅ 全部使用 `--yds-*` 变量 | 见下方变量清单 |

### 2. 使用的 YDS 变量

#### 颜色变量
```css
/* 品牌色 */
--yds-color-brand-primary: #ff77e7

/* 中性色 */
--yds-color-neutral-black: #1b1b1b
--yds-color-neutral-white: #ffffff
--yds-color-neutral-gray: #f4f5f7

/* 文字颜色 */
--yds-text-primary: #1b1b1b
--yds-text-secondary: #4e4f54
--yds-text-tertiary: #7e828c
--yds-text-disabled: #b9bbbf

/* 透明度 */
--yds-color-opacity-black-4: rgba(27, 27, 27, 0.04)
--yds-color-opacity-black-8: rgba(27, 27, 27, 0.08)
--yds-color-opacity-black-16: rgba(27, 27, 27, 0.16)
```

#### 间距变量
```css
--yds-spacing-4: 4px
--yds-spacing-8: 8px
--yds-spacing-12: 12px
--yds-spacing-16: 16px
--yds-spacing-24: 24px
```

#### 圆角变量
```css
--yds-radius-none: 0px    /* 直角 */
--yds-radius-sm: 2px      /* 小圆角（复选框） */
--yds-radius-md: 4px
--yds-radius-lg: 8px
```

#### 字体变量
```css
--yds-font-family-base: PingFang SC, -apple-system, ...
--yds-font-size-12: 12px
--yds-font-size-13: 13px
--yds-font-size-14: 14px
--yds-font-size-15: 15px
--yds-font-size-16: 16px
--yds-font-weight-regular: 400
--yds-font-weight-medium: 500
--yds-font-weight-semibold: 600
```

### 3. 样式对比

#### 之前的样式（渐变、圆角、阴影）
```css
/* ❌ 旧样式 */
.plugin-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
}

.button-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
}
```

#### 现在的样式（直角、无阴影、黑色）
```css
/* ✅ 新样式 - 符合年轻版设计系统 */
.plugin-container {
  background-color: var(--yds-color-neutral-white);
  border: 1px solid var(--yds-border-color);
  border-radius: var(--yds-radius-none);
  box-shadow: none;
}

.button-primary {
  background-color: var(--yds-color-neutral-black);
  border-radius: var(--yds-radius-none);
  box-shadow: none;
}
```

### 4. UI 组件样式

#### 主按钮（黑色、直角）
- **背景色**：`var(--yds-color-neutral-black)` (#1b1b1b)
- **文字色**：`var(--yds-color-neutral-white)` (#ffffff)
- **圆角**：`var(--yds-radius-none)` (0px)
- **阴影**：`none`
- **悬停**：背景色变为 `#3a3a3a`

#### 次要按钮（白色、直角、边框）
- **背景色**：`var(--yds-color-neutral-white)` (#ffffff)
- **文字色**：`var(--yds-text-primary)` (#1b1b1b)
- **边框**：`1px solid var(--yds-border-color)`
- **圆角**：`var(--yds-radius-none)` (0px)
- **阴影**：`none`
- **悬停**：背景色变为 `var(--yds-color-neutral-gray)`

#### 输入框（直角、聚焦时品牌色边框）
- **背景色**：`var(--yds-color-neutral-white)`
- **边框**：`1px solid var(--yds-border-color)`
- **圆角**：`var(--yds-radius-none)` (0px)
- **聚焦**：边框变为 `var(--yds-border-focus)` (#ff77e7)
- **阴影**：`none`

#### 复选框容器（灰色背景、直角）
- **背景色**：`var(--yds-color-neutral-gray)` (#f4f5f7)
- **圆角**：`var(--yds-radius-none)` (0px)
- **悬停**：背景色变为 `var(--yds-color-opacity-black-4)`

### 5. 移除的装饰性元素

- ❌ Emoji（✨ 🚀）
- ❌ 渐变背景
- ❌ 阴影效果
- ❌ 圆角（除复选框用 2px 小圆角）
- ❌ 浮动动画

### 6. 文件结构

```
figma-plugin-starter/
├── src/
│   ├── yds-variables.css    # 年轻版设计系统变量
│   ├── styles.css           # 使用 YDS 变量的样式
│   ├── ui.tsx              # 导入 yds-variables.css
│   ├── main.ts
│   └── types.ts
```

### 7. 在 Figma 中查看效果

1. **构建插件**：
   ```bash
   npm run build
   ```

2. **在 Figma 中重新加载**：
   - 按 `⌘⌥P` 重新加载插件
   - 或重新导入 `manifest.json`

3. **运行插件**查看年轻版设计系统效果

## 🎯 核心差异总结

| 设计元素 | 旧设计 | 新设计（年轻版设计系统） |
|---------|---------------------|----------------------|
| **容器背景** | 紫色渐变 | 白色 |
| **容器圆角** | 12px | 0px（直角） |
| **阴影** | 有阴影 | 无阴影 |
| **主按钮** | 紫色渐变 | 黑色 |
| **按钮圆角** | 8px | 0px（直角） |
| **装饰** | Emoji | 无 |
| **设计风格** | 现代渐变 | 扁平化、直角 |
| **颜色系统** | 自定义 | YDS 变量 |

## 📚 参考资源

- **年轻版设计系统**：`/Users/linyazhou/young-design-system/`
- **颜色系统**：`css/colors.css`（256 个变量）
- **设计规范**：`docs/design-standards.md`

---

**更新日期**：2025-02-10
**设计系统版本**：Young Design System v2.0
