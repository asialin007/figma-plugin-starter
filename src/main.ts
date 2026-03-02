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

      // 重命名结果统计
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      // 遍历所有选中的图层并重命名
      selection.forEach((node, index) => {
        try {
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
          successCount++
        } catch (error) {
          failCount++
          errors.push(`图层 "${node.name}" 重命名失败: ${error instanceof Error ? error.message : String(error)}`)
        }
      })

      // 发送结果通知到 UI
      figma.ui.postMessage({
        type: 'RENAME_COMPLETE',
        successCount,
        failCount,
        errors
      })

      // 如果有失败，显示通知
      if (failCount > 0) {
        figma.notify(`⚠️ 重命名完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      }

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
      const selection = figma.currentPage.selection

      if (selection.length === 0) {
        figma.notify('⚠️ 请先选中要重命名的图层')
        return
      }

      // 获取切图配置
      const exportOptions = message.exportOptions

      // 重命名结果统计
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      // 遍历所有选中的图层并重命名
      selection.forEach((node) => {
        try {
          const parts: string[] = []

          // 1. 年轻版前缀
          if (exportOptions?.useYoungPrefix) {
            parts.push('y')
          }

          // 2. 图标/图片类型
          if (exportOptions?.exportType) {
            parts.push(exportOptions.exportType)
          }

          // 3. 风格
          if (exportOptions?.style) {
            parts.push(exportOptions.style)
          }

          // 4. 类型
          if (exportOptions?.category) {
            parts.push(exportOptions.category)
          }

          // 5. 名称/功能（使用图层原有名称）
          parts.push(node.name)

          // 6. 状态（可选）
          if (exportOptions?.state) {
            parts.push(exportOptions.state)
          }

          // 7. 颜色（可选）
          if (exportOptions?.color) {
            parts.push(exportOptions.color)
          }

          // 8. 尺寸（可选）
          if (exportOptions?.size) {
            parts.push(exportOptions.size)
          }

          // 9. 透明度（可选）
          if (exportOptions?.opacity) {
            parts.push(exportOptions.opacity)
          }

          // 10. 深色模式后缀（可选）
          if (exportOptions?.useDarkMode) {
            parts.push('dk')
          }

          // 使用下划线连接所有部分
          node.name = parts.join('_')
          successCount++
        } catch (error) {
          failCount++
          errors.push(`图层 "${node.name}" 重命名失败: ${error instanceof Error ? error.message : String(error)}`)
        }
      })

      // 发送结果通知到 UI
      figma.ui.postMessage({
        type: 'RENAME_COMPLETE',
        successCount,
        failCount,
        errors
      })

      // 显示结果通知
      if (failCount > 0) {
        figma.notify(`⚠️ 重命名完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      } else {
        figma.notify(`✅ 已重命名 ${successCount} 个图层`)
      }
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
