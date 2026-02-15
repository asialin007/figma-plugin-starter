import { showUI } from '@create-figma-plugin/utilities'

import { RenameOptions, ExportOptions } from './types'

export default function () {
  // 监听来自 UI 的消息
  figma.ui.onmessage = (message: { type: string; options?: RenameOptions; exportOptions?: ExportOptions }) => {
    // 处理获取选中图层信息的请求
    if (message.type === 'GET_SELECTION_INFO') {
      const selection = figma.currentPage.selection
      const selectedName = selection.length > 0 ? selection[0].name : null
      const layerType = selection.length > 0 ? selection[0].type : null
      // 获取所有选中图层的名称
      const allSelectedNames = selection.map(node => node.name)
      figma.ui.postMessage({
        type: 'SELECTION_INFO',
        selectedName,
        layerType,
        count: selection.length,
        allSelectedNames  // 返回所有图层名称
      })
    }

    // 处理重命名请求
    if (message.type === 'APPLY_RENAME' && message.options) {
      const { renameValue, prefix, suffix, startNumber, addNumber, showPrefix, showSuffix } = message.options
      const selection = figma.currentPage.selection

      // 检查是否有选中的图层
      if (selection.length === 0) {
        figma.notify('⚠️ 请先选中要重命名的图层')
        return
      }

      // 遍历所有选中的图层并重命名
      selection.forEach((node, index) => {
        let newName = ''

        // 1. 确定基础名称
        if (renameValue) {
          newName = renameValue  // 使用"重命名"输入框的值
        } else {
          newName = node.name  // 使用原名称
        }

        // 2. 添加前缀（开关打开且有前缀时）
        if (showPrefix && prefix) {
          newName = prefix + '_' + newName
        }

        // 3. 添加后缀（开关打开且有后缀时）
        if (showSuffix && suffix) {
          newName = newName + '_' + suffix
        }

        // 4. 添加编号
        if (addNumber) {
          const number = startNumber + index
          // 格式化数字为两位数，如 01, 02, 03
          const formattedNumber = number.toString().padStart(2, '0')
          newName = newName + '_' + formattedNumber
        }

        node.name = newName
      })

      // 重命名后更新 UI 中的选中信息
      const newSelection = figma.currentPage.selection
      const newSelectedName = newSelection.length > 0 ? newSelection[0].name : null
      figma.ui.postMessage({
        type: 'SELECTION_INFO',
        selectedName: newSelectedName,
        count: newSelection.length
      })
    }

    // 处理切图模式重命名请求
    if (message.type === 'APPLY_EXPORT_RENAME' && message.options && message.exportOptions) {
      const { preserveOriginalName } = message.options
      const selection = figma.currentPage.selection

      if (selection.length === 0) {
        figma.notify('⚠️ 请先选中要重命名的图层')
        return
      }

      // 获取切图配置
      const exportOptions = message.exportOptions

      // 遍历所有选中的图层并重命名
      selection.forEach((node) => {
        let newName = ''

        // 使用图层原有名称
        newName = node.name

        // 添加年轻版前缀
        if (exportOptions?.useYoungPrefix) {
          newName = 'y_' + newName
        }

        // 添加图标/图片类型
        if (exportOptions?.exportType) {
          newName = exportOptions.exportType + '_' + newName
        }

        // 添加风格
        if (exportOptions?.style) {
          newName = exportOptions.style + '_' + newName
        }

        // 添加类型
        if (exportOptions?.category) {
          newName = exportOptions.category + '_' + newName
        }

        // 名称已在上面使用原有名称，不再添加

        // 添加状态（可选）
        if (exportOptions?.state) {
          newName = newName + '_' + exportOptions.state
        }

        // 添加颜色（可选）
        if (exportOptions?.color) {
          newName = newName + '_' + exportOptions.color
        }

        // 添加尺寸（可选）
        if (exportOptions?.size) {
          newName = newName + '_' + exportOptions.size
        }

        // 添加透明度（可选）
        if (exportOptions?.opacity) {
          newName = newName + '_' + exportOptions.opacity
        }

        // 添加深色模式后缀（可选）
        if (exportOptions?.useDarkMode) {
          newName = newName + '_dk'
        }

        node.name = newName
      })

      // UI 已显示 toast，此处不再重复显示
    }
  }

  // 监听选择变化，自动更新 UI
  figma.on('selectionchange', () => {
    const selection = figma.currentPage.selection
    const selectedName = selection.length > 0 ? selection[0].name : null
    const layerType = selection.length > 0 ? selection[0].type : null
    // 获取所有选中图层的名称
    const allSelectedNames = selection.map(node => node.name)
    figma.ui.postMessage({
      type: 'SELECTION_INFO',
      selectedName,
      layerType,
      count: selection.length,
      allSelectedNames  // 返回所有图层名称
    })
  })

  // 显示 UI 界面
  showUI({ width: 400, height: 690 })
}
