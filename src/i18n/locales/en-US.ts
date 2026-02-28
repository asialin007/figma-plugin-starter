/**
 * 英文语言包
 */
import { TranslationMessages } from '../types'

export const enUS: TranslationMessages = {
  // 选项卡
  tabs: {
    layer: 'Layer Rename',
    slice: 'Slice Rename'
  },

  // 表单标签
  labels: {
    newName: 'New Name',
    prefix: 'Prefix',
    suffix: 'Suffix',
    nameFunction: 'Name/Function',
    iconImage: 'Icon/Image',
    style: 'Style',
    type: 'Type',
    placeholder: {
      newName: 'Enter new name, e.g. container',
      prefix: 'Enter prefix',
      suffix: 'Enter suffix',
      nameFunction: 'Enter name/function',
      state: 'Enter state',
      color: 'Enter color',
      size: 'Enter size',
      opacity: 'Enter opacity'
    }
  },

  // 开关
  switches: {
    addStartNumber: 'Add Start Number',
    stateOptional: 'State (Optional)',
    colorOptional: 'Color (Optional)',
    sizeOptional: 'Size (Optional)',
    opacityOptional: 'Opacity (Optional)',
    youngPrefix: 'Young Prefix y_',
    darkModeSuffix: 'Dark Mode Suffix _dk'
  },

  // 快捷词分组标题
  quickTagGroups: {
    containerLayout: 'Container/Layout',
    basicElements: 'Basic Elements',
    uiComponents: 'UI Components',
    mediaGraphics: 'Media/Graphics',
    state: 'State',
    navigation: 'Navigation'
  },

  // 按钮
  buttons: {
    reset: 'Reset',
    apply: 'Apply'
  },

  // 提示
  messages: {
    selectLayersFirst: 'Please select layers first',
    selectNameFunction: 'Please select name/function',
    copied: 'Copied successfully',
    renamed: 'Renamed successfully',
    selectedLayers: 'Selected',
    layersSuffix: 'layers'
  },

  // 占位符
  placeholders: {
    selectNameFunction: 'Please select name/function',
    selectLayersFirst: 'Please select layers first'
  },

  // 版权
  copyright: 'Copyright',

  // 语言选择
  language: {
    zhCN: '中文',
    enUS: 'English'
  },

  // 主题选择
  theme: {
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto'
  }
}
