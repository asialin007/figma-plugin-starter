/**
 * i18n 类型定义
 */

/** 支持的语言 */
export type Locale = 'zh-CN' | 'en-US'

/** 语言配置 */
export interface LocaleConfig {
  label: string  // 显示标签
  value: Locale  // 语言代码
}

/** 翻译文本接口 */
export interface TranslationMessages {
  // 选项卡
  tabs: {
    layer: string      // 图层命名
    slice: string      // 切图命名
  }

  // 表单标签
  labels: {
    newName: string           // 新名称
    prefix: string            // 前缀
    suffix: string            // 后缀
    nameFunction: string      // 名称/功能
    iconImage: string         // 图标/图片
    style: string             // 风格
    type: string              // 类型
    placeholder: {
      newName: string         // 请输入新名称
      prefix: string          // 请输入前缀名
      suffix: string          // 请输入后缀名
      nameFunction: string    // 请输入名称/功能
      state: string           // 请输入状态
      color: string           // 请输入颜色
      size: string            // 请输入尺寸
      opacity: string         // 请输入透明度
    }
  }

  // 开关
  switches: {
    addStartNumber: string    // 添加起始编号
    stateOptional: string     // 状态（选填）
    colorOptional: string     // 颜色（选填）
    sizeOptional: string      // 尺寸（选填）
    opacityOptional: string   // 透明度（选填）
    youngPrefix: string       // 年轻版前缀 y_
    darkModeSuffix: string    // 深色模式后缀 _dk
  }

  // 快捷词分组标题
  quickTagGroups: {
    containerLayout: string   // 容器/布局
    basicElements: string     // 基础元素
    uiComponents: string      // UI 组件
    mediaGraphics: string     // 媒体/图形
    state: string             // 状态
    navigation: string        // 导航
  }

  // 按钮
  buttons: {
    reset: string    // 重置
    apply: string    // 应用
  }

  // 提示
  messages: {
    selectLayersFirst: string     // 请先选中图层
    selectNameFunction: string    // 请先选择名称/功能
    copied: string                // 复制成功
    renamed: string               // 命名成功
    selectedLayers: string        // 已选中 X 个图层
    layersSuffix: string          // 个图层（中文后缀）
  }

  // 占位符（generateExportName 返回值）
  placeholders: {
    selectNameFunction: string
    selectLayersFirst: string
  }

  // 版权
  copyright: string

  // 语言选择
  language: {
    zhCN: string   // 中文
    enUS: string   // English
  }

  // 主题选择
  theme: {
    light: string   // 浅色模式
    dark: string    // 深色模式
    auto: string    // 跟随系统
  }
}
