/**
 * 中文语言包
 */
import { TranslationMessages } from '../types'

export const zhCN: TranslationMessages = {
  // 选项卡
  tabs: {
    layer: '图层命名',
    slice: '切图命名'
  },

  // 表单标签
  labels: {
    newName: '新名称',
    prefix: '前缀',
    suffix: '后缀',
    nameFunction: '名称/功能',
    iconImage: '图标/图片',
    style: '风格',
    type: '类型',
    placeholder: {
      newName: '请输入新名称，如：container',
      prefix: '请输入前缀名',
      suffix: '请输入后缀名',
      nameFunction: '请输入名称/功能',
      state: '请输入状态',
      color: '请输入颜色',
      size: '请输入尺寸',
      opacity: '请输入透明度'
    }
  },

  // 开关
  switches: {
    addStartNumber: '添加起始编号',
    stateOptional: '状态（选填）',
    colorOptional: '颜色（选填）',
    sizeOptional: '尺寸（选填）',
    opacityOptional: '透明度（选填）',
    youngPrefix: '年轻版前缀 y_',
    darkModeSuffix: '深色模式后缀 _dk'
  },

  // 快捷词分组标题
  quickTagGroups: {
    containerLayout: '容器/布局',
    basicElements: '基础元素',
    uiComponents: 'UI 组件',
    mediaGraphics: '媒体/图形',
    state: '状态',
    navigation: '导航'
  },

  // 按钮
  buttons: {
    reset: '重置',
    apply: '应用'
  },

  // 提示
  messages: {
    selectLayersFirst: '请先选中图层',
    selectNameFunction: '请先选择名称/功能',
    copied: '复制成功',
    renamed: '命名成功',
    selectedLayers: '已选中',
    layersSuffix: '个图层'
  },

  // 占位符
  placeholders: {
    selectNameFunction: '请选择名称/功能',
    selectLayersFirst: '请先选中图层'
  },

  // 版权
  copyright: '版权所有',

  // 语言选择
  language: {
    zhCN: '中文',
    enUS: 'English'
  },

  // 主题选择
  theme: {
    light: '浅色模式',
    dark: '深色模式',
    auto: '跟随系统'
  }
}
