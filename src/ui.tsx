import {
  render,
  Textbox
} from '@create-figma-plugin/ui'
import { h, Fragment } from 'preact'
import { useCallback, useState, useEffect, useMemo, useRef } from 'preact/hooks'

import './yds-variables.css'
import styles from './styles.css'
import { RenameOptions, ExportOptions } from './types'

function Plugin() {
  // 表单状态
  const [renameValue, setRenameValue] = useState('')  // 重命名
  const [prefix, setPrefix] = useState('')           // 前缀
  const [suffix, setSuffix] = useState('')           // 后缀
  const [startNumber, setStartNumber] = useState('1')
  const [addNumber, setAddNumber] = useState(false)
  const [showPrefix, setShowPrefix] = useState(false)
  const [showSuffix, setShowSuffix] = useState(false)
  const [selectedLayerName, setSelectedLayerName] = useState<string | null>(null)
  const [layerType, setLayerType] = useState<string | null>(null)
  const [selectionCount, setSelectionCount] = useState(0)
  const [allSelectedNames, setAllSelectedNames] = useState<string[]>([])  // 所有选中图层的名称列表
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [currentMode, setCurrentMode] = useState<'layer' | 'export'>('layer')

  // 切图命名状态
  const [useYoungPrefix, setUseYoungPrefix] = useState(false)
  const [exportType, setExportType] = useState('')
  const [exportStyle, setExportStyle] = useState('')
  const [exportCategory, setExportCategory] = useState('')
  const [exportName, setExportName] = useState('')
  const [exportState, setExportState] = useState('')
  const [exportColor, setExportColor] = useState('')
  const [exportSize, setExportSize] = useState('')
  const [exportOpacity, setExportOpacity] = useState('')
  const [useDarkMode, setUseDarkMode] = useState(false)
  const [showState, setShowState] = useState(false)
  const [showColor, setShowColor] = useState(false)
  const [showSize, setShowSize] = useState(false)
  const [showOpacity, setShowOpacity] = useState(false)
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false)  // 追踪用户是否手动编辑了名称字段
  const [hasAutoFilled, setHasAutoFilled] = useState(false)  // 追踪是否已经自动填充过（避免重复）

  const scrollableRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | null>(null)
  const [isToastShowing, setIsToastShowing] = useState(false)

  // 显示 toast 的通用函数
  const showToastMessage = useCallback(function (message: string) {
    // 如果toast已经在显示中，不重复显示
    if (isToastShowing) {
      return
    }

    // 清除之前的定时器
    if (toastTimer.current !== null) {
      clearTimeout(toastTimer.current)
    }

    setToastMessage(message)
    setShowToast(true)
    setIsToastShowing(true)

    // 设置新的定时器
    toastTimer.current = window.setTimeout(() => {
      setShowToast(false)
      setIsToastShowing(false)
      toastTimer.current = null
    }, 2000)
  }, [isToastShowing])

  // 复制到剪贴板的函数
  const handleCopy = useCallback(function (text: string) {
    if (text) {
      // 使用兼容的方法复制文本
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful) {
          // 复制成功，显示 toast
          showToastMessage('复制成功')
        }
      } catch (err) {
        console.error('复制失败:', err)
      }

      document.body.removeChild(textarea)
    }
  }, [showToastMessage])

  // 获取图层类型的中文名称
  const getLayerTypeName = (type: string | null): string => {
    if (!type) return ''
    // 映射 Figma 类型到中文名称
    const typeMap: Record<string, string> = {
      'FRAME': 'Frame',
      'GROUP': 'Group',
      'COMPONENT': 'Component',
      'INSTANCE': 'Instance',
      'TEXT': 'Text',
      'VECTOR': 'Vector',
      'BOOLEAN_OPERATION': 'Boolean',
      'REGULAR_POLYGON': 'Polygon'
    }
    return typeMap[type] || type
  }

  // 生成切图名称的辅助函数
  const generateExportName = useCallback((options: ExportOptions): string => {
    const {
      useYoungPrefix,
      exportType,
      style,
      category,
      name,
      state,
      color,
      size,
      opacity,
      useDarkMode
    } = options

    if (!name) return '请选择名称/功能'

    const parts: string[] = []

    // 1. 年轻版前缀
    if (useYoungPrefix) {
      parts.push('y')
    }

    // 2. 图标/图片
    if (exportType) {
      parts.push(exportType)
    }

    // 3. 风格
    if (style) {
      parts.push(style)
    }

    // 4. 类型
    if (category) {
      parts.push(category)
    }

    // 5. 名称/功能
    parts.push(name)

    // 6. 状态（可选）
    if (state) {
      parts.push(state)
    }

    // 7. 颜色（可选）
    if (color) {
      parts.push(color)
    }

    // 8. 尺寸（可选）
    if (size) {
      parts.push(size)
    }

    // 9. 透明度（可选）
    if (opacity) {
      parts.push(opacity)
    }

    // 10. 深色模式后缀（可选）
    if (useDarkMode) {
      parts.push('dk')
    }

    return parts.join('_')
  }, [])

  // 为单个图层生成切图名称的辅助函数
  const generateExportNameForLayer = useCallback((layerName: string): string => {
    const options: ExportOptions = {
      useYoungPrefix,
      exportType,
      style: exportStyle,
      category: exportCategory,
      name: layerName,  // 使用图层原有名称
      state: showState ? exportState : '',
      color: showColor ? exportColor : '',
      size: showSize ? exportSize : '',
      opacity: showOpacity ? exportOpacity : '',
      useDarkMode
    }
    return generateExportName(options)
  }, [useYoungPrefix, exportType, exportStyle, exportCategory, showState, exportState, showColor, exportColor, showSize, exportSize, showOpacity, exportOpacity, useDarkMode, generateExportName])

  // 监听来自 main.ts 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.pluginMessage) {
        const { type, selectedName, layerType, count, allSelectedNames } = event.data.pluginMessage
        if (type === 'SELECTION_INFO') {
          setSelectedLayerName(selectedName)
          setLayerType(layerType)
          setSelectionCount(count)
          // 存储所有选中图层的名称
          if (allSelectedNames) {
            setAllSelectedNames(allSelectedNames)
          }

          // 选中图层变化时，重置标记（允许重新自动填充）
          setHasAutoFilled(false)
          setHasManuallyEditedName(false)

          // 取消选中图层：清空输入框，恢复默认态
          if (count === 0) {
            setExportName('')
            setRenameValue('')
            setAllSelectedNames([])
          }
          // 切图模式：自动填充原有名称到输入框
          else if (currentMode === 'export' && selectedName) {
            setExportName(selectedName)
            setHasAutoFilled(true)  // 标记已自动填充
          }
          // 图层命名模式：自动填充原有名称到输入框
          else if (currentMode === 'layer' && selectedName) {
            setRenameValue(selectedName)
            setHasAutoFilled(true)  // 标记已自动填充
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    // 请求选中图层信息
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTION_INFO' } }, '*')

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [currentMode, exportName, renameValue, hasManuallyEditedName])

  // 计算预览名称
  const previewName = useMemo(() => {
    if (currentMode === 'export') {
      // 切图命名模式：生成切图名称
      return generateExportName({
        useYoungPrefix,
        exportType,
        style: exportStyle,
        category: exportCategory,
        name: exportName,
        state: showState ? exportState : '',      // 只有开关打开才显示
        color: showColor ? exportColor : '',      // 只有开关打开才显示
        size: showSize ? exportSize : '',        // 只有开关打开才显示
        opacity: showOpacity ? exportOpacity : '', // 只有开关打开才显示
        useDarkMode
      })
    } else {
      // 图层命名模式
      if (!selectedLayerName) return '请先选中图层'

      let newName = selectedLayerName

      // 应用重命名
      if (renameValue) {
        newName = renameValue
      }

      // 应用前缀（开关打开且有前缀时）
      if (showPrefix && prefix) {
        newName = prefix + '_' + newName
      }

      // 应用后缀（开关打开且有后缀时）
      if (showSuffix && suffix) {
        newName = newName + '_' + suffix
      }

      // 应用编号（开关打开时）
      if (addNumber) {
        const number = parseInt(startNumber) || 1
        const formattedNumber = number.toString().padStart(2, '0')
        newName = newName + '_' + formattedNumber
      }

      return newName
    }
  }, [currentMode, selectedLayerName, renameValue, prefix, suffix, startNumber, addNumber, showPrefix, showSuffix, useYoungPrefix, exportType, exportStyle, exportCategory, exportName, exportState, exportColor, exportSize, exportOpacity, useDarkMode, showState, showColor, showSize, showOpacity, generateExportName, selectionCount, hasManuallyEditedName])

  // 处理应用按钮点击
  const handleApplyRename = useCallback(function () {
    // 两种模式都需要检查是否选中了图层
    if (selectionCount === 0) {
      showToastMessage('请先选中图层')
      return
    }

    if (currentMode === 'layer') {
      // 图层命名模式：执行重命名
      const options: RenameOptions = {
        renameValue,
        prefix,
        suffix,
        startNumber: parseInt(startNumber) || 1,
        addNumber,
        showPrefix,
        showSuffix
      }
      parent.postMessage({ pluginMessage: { type: 'APPLY_RENAME', options } }, '*')
      showToastMessage('命名成功')
    } else {
      // 切图命名模式：将生成的名称应用到图层
      const name = previewName

      // 判断是否需要保留原有名称
      // 条件：选中多个图层 && 用户没有手动编辑名称字段
      const shouldPreserveOriginalName = selectionCount > 1 && !hasManuallyEditedName

      if (shouldPreserveOriginalName) {
        // 保留原有名称：直接应用，不需要检查 name
        // 因为预览会显示 "保留 X 个图层的原有名称并添加前后缀"
        // 此时 name 包含 "保留"，不应该通过正常的名称校验
        const options: RenameOptions = {
          renameValue: '',  // 空值表示使用各图层原有名称
          prefix: '',
          suffix: '',
          startNumber: 1,
          addNumber: false,
          showPrefix: false,
          showSuffix: false,
          preserveOriginalName: true  // 标记保留原有名称
        }
        parent.postMessage({
          pluginMessage: {
            type: 'APPLY_EXPORT_RENAME',
            options,
            exportOptions: {
              useYoungPrefix,
              exportType,
              style: exportStyle,
              category: exportCategory,
              state: showState ? exportState : '',
              color: showColor ? exportColor : '',
              size: showSize ? exportSize : '',
              opacity: showOpacity ? exportOpacity : '',
              useDarkMode
            }
          }
        }, '*')
        showToastMessage('命名成功')
      } else {
        // 使用统一名称：需要检查是否选择了名称/功能
        if (name && name !== '请选择名称/功能' && !name.includes('保留')) {
          // 使用统一名称：原逻辑
          const options: RenameOptions = {
            renameValue: name,
            prefix: '',
            suffix: '',
            startNumber: 1,
            addNumber: false,
            showPrefix: false,
            showSuffix: false
          }
          parent.postMessage({ pluginMessage: { type: 'APPLY_RENAME', options } }, '*')
          showToastMessage('命名成功')
        } else {
          showToastMessage('请先选择名称/功能')
        }
      }
    }
  }, [currentMode, renameValue, prefix, suffix, startNumber, addNumber, showPrefix, showSuffix, previewName, showToastMessage, selectionCount, hasManuallyEditedName, useYoungPrefix, exportType, exportStyle, exportCategory, exportState, exportColor, exportSize, exportOpacity, useDarkMode, showState, showColor, showSize, showOpacity])

  // 处理重置按钮点击
  const handleReset = useCallback(function () {
    if (currentMode === 'layer') {
      // 重置图层命名表单
      setRenameValue('')
      setPrefix('')
      setSuffix('')
      setStartNumber('1')
      setAddNumber(false)
      setShowPrefix(false)
      setShowSuffix(false)
    } else {
      // 重置切图命名表单
      setUseYoungPrefix(false)
      setExportType('')
      setExportStyle('')
      setExportCategory('')
      setExportName('')
      setExportState('')
      setExportColor('')
      setExportSize('')
      setExportOpacity('')
      setUseDarkMode(false)
      setShowState(false)
      setShowColor(false)
      setShowSize(false)
      setShowOpacity(false)
    }
  }, [currentMode])

  return (
    <div class={styles['plugin-container']}>
      {/* 可滚动内容区域 */}
      <div class={styles['scrollable-content']} ref={scrollableRef}>
        {/* 预览区域（包含选项卡） */}
        <div class={styles['preview-section']}>
          {/* 选项卡切换 */}
          <div class={styles['mode-tabs']}>
            <button
              class={`${styles['mode-tab']} ${currentMode === 'layer' ? styles['mode-tab--active'] : ''}`}
              onClick={() => { setCurrentMode('layer'); setHasAutoFilled(false); setHasManuallyEditedName(false) }}
              type="button"
            >
              图层命名
            </button>
            <button
              class={`${styles['mode-tab']} ${currentMode === 'export' ? styles['mode-tab--active'] : ''}`}
              onClick={() => { setCurrentMode('export'); setHasAutoFilled(false); setHasManuallyEditedName(false) }}
              type="button"
            >
              切图命名
            </button>
          </div>

          {/* 预览内容 */}
          <div class={styles['preview-box']}>
            <div class={styles['preview-label']}>
              {selectionCount > 0 && (
                <span class={styles['preview-count']}>
                  已选中 <strong>{selectionCount}</strong> 个图层
                </span>
              )}
            </div>
            <div class={`${styles['preview-content']} ${currentMode === 'export' ? styles['preview-content--vertical'] : ''}`}>
              {currentMode === 'export' ? (
                // 切图命名模式
                <Fragment>
                  {selectionCount > 1 && !hasManuallyEditedName ? (
                    // 多图层且未手动编辑：显示所有图层的预览列表
                    <div class={styles['preview-list']}>
                      {allSelectedNames.map((name, index) => (
                        <div key={index} class={styles['preview-list-item']}>
                          <div class={styles['preview-list-original']}>{name}</div>
                          <div class={styles['preview-list-arrow']}>→</div>
                          <div class={`${styles['preview-list-new']} ${generateExportNameForLayer(name) !== '请选择名称/功能' ? styles['preview-new--with-copy'] : ''}`}>
                            <span class={styles['preview-text']}>{generateExportNameForLayer(name)}</span>
                            {generateExportNameForLayer(name) !== '请选择名称/功能' && generateExportNameForLayer(name) !== '请先选中图层' && (
                              <button
                                class={styles['preview-copy-button']}
                                onClick={(e) => {
                                  handleCopy(generateExportNameForLayer(name))
                                  setTimeout(() => {
                                    e.currentTarget.blur()
                                  }, 0)
                                }}
                                type="button"
                                aria-label="复制"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                                  <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // 单图层或已手动编辑：显示单个预览
                    <Fragment>
                      {selectedLayerName && (
                        <div class={styles['preview-original']}>
                          {selectedLayerName}
                        </div>
                      )}
                      {(selectedLayerName || (previewName && previewName !== '请选择名称/功能')) ? (
                        <div class={`${styles['preview-new']} ${previewName !== '请选择名称/功能' && previewName !== '请先选中图层' ? styles['preview-new--with-copy'] : ''}`}>
                          <span class={styles['preview-text']}>{previewName}</span>
                          {previewName !== '请选择名称/功能' && previewName !== '请先选中图层' && (
                            <button
                              class={styles['preview-copy-button']}
                              onClick={(e) => {
                                handleCopy(previewName)
                                setTimeout(() => {
                                  e.currentTarget.blur()
                                }, 0)
                              }}
                              type="button"
                              aria-label="复制"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                                <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div class={styles['preview-placeholder']}>
                          {previewName}
                        </div>
                      )}
                    </Fragment>
                  )}
                </Fragment>
              ) : (
                // 图层命名模式：显示原始名称 -> 新名称
                <Fragment>
                  {selectedLayerName && (
                    <Fragment>
                      <div class={styles['preview-original']}>
                        {selectedLayerName}
                      </div>
                      <div class={styles['preview-arrow']}>→</div>
                      <div class={styles['preview-new']}>
                        {previewName}
                      </div>
                    </Fragment>
                  )}
                  {!selectedLayerName && (
                    <div class={styles['preview-placeholder']}>
                      {previewName}
                    </div>
                  )}
                </Fragment>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域：自适应高度 */}
        <div class={styles['form-content']}>
        {/* 图层命名表单 */}
        {currentMode === 'layer' && (
          <Fragment>
        {/* 新名称输入框 */}
        <div class={styles['form-group']}>
          <label class={styles['form-label']}>新名称</label>
          <div class={styles['input-with-clear']}>
            <Textbox
              onValueInput={setRenameValue}
              placeholder="请输入新名称，如：container"
              value={renameValue}
            />
            {renameValue && (
              <Fragment>
                <button
                  class={styles['copy-button']}
                  onClick={(e) => {
                    handleCopy(renameValue)
                    // 延迟移除焦点，避免干扰复制操作
                    setTimeout(() => {
                      e.currentTarget.blur()
                    }, 0)
                  }}
                  type="button"
                  aria-label="复制"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                    <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                  </svg>
                </button>
                <button
                  class={styles['clear-button']}
                  onClick={() => setRenameValue('')}
                  type="button"
                  aria-label="清空"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                    <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                  </svg>
                </button>
              </Fragment>
            )}
          </div>
          {/* 快捷词标签 */}
          <div class={styles['quick-tags']}>
            {/* 原有标签 */}
            <button class={styles['quick-tag']} onClick={() => setRenameValue('container')} type="button">container</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('icon')} type="button">icon</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('title')} type="button">title</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('text')} type="button">text</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('item')} type="button">item</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('description')} type="button">description</button>

            {/* UI 组件类型 */}
            <button class={styles['quick-tag']} onClick={() => setRenameValue('button')} type="button">button</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('card')} type="button">card</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('modal')} type="button">modal</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('input')} type="button">input</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('list')} type="button">list</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('table')} type="button">table</button>

            {/* 内容元素 */}
            <button class={styles['quick-tag']} onClick={() => setRenameValue('image')} type="button">image</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('avatar')} type="button">avatar</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('link')} type="button">link</button>

            {/* 交互元素 */}
            <button class={styles['quick-tag']} onClick={() => setRenameValue('checkbox')} type="button">checkbox</button>
            <button class={styles['quick-tag']} onClick={() => setRenameValue('tabs')} type="button">tabs</button>
          </div>
        </div>

        {/* 前缀输入框 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>前缀</span>
          <div
            style={{
              width: '36px',
              height: '22px',
              backgroundColor: showPrefix ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
              borderRadius: '48px',
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              const newValue = !showPrefix
              setShowPrefix(newValue)
              // 如果打开开关，延迟滚动到前缀输入框可见区域（包含快捷词）
              if (newValue) {
                setTimeout(() => {
                  const prefixInput = scrollableRef.current?.querySelector('input[placeholder="请输入前缀名"]')
                  if (prefixInput) {
                    // 使用 center 确保输入框和下方的快捷词都可见
                    prefixInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '50%',
                left: showPrefix ? '17px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        </div>

        {showPrefix && (
          <div class={`${styles['form-group']} ${styles['form-group--after-switch']}`}>
            <div class={styles['input-with-clear']}>
              <Textbox
                onValueInput={setPrefix}
                placeholder="请输入前缀名"
                value={prefix}
              />
              {prefix && (
                <Fragment>
                  <button
                    class={styles['copy-button']}
                    onClick={(e) => {
                      handleCopy(prefix)
                      // 延迟移除焦点，避免干扰复制操作
                      setTimeout(() => {
                        e.currentTarget.blur()
                      }, 0)
                    }}
                    type="button"
                    aria-label="复制"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                      <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button
                    class={styles['clear-button']}
                    onClick={() => setPrefix('')}
                    type="button"
                    aria-label="清空"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                      <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                    </svg>
                  </button>
                </Fragment>
              )}
            </div>
            {/* 快捷词标签 */}
            <div class={styles['quick-tags']}>
              {/* 状态前缀 */}
              <button class={styles['quick-tag']} onClick={() => setPrefix('active')} type="button">active</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('disabled')} type="button">disabled</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('loading')} type="button">loading</button>

              {/* 尺寸前缀 */}
              <button class={styles['quick-tag']} onClick={() => setPrefix('small')} type="button">small</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('medium')} type="button">medium</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('large')} type="button">large</button>

              {/* 位置前缀 */}
              <button class={styles['quick-tag']} onClick={() => setPrefix('left')} type="button">left</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('right')} type="button">right</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('header')} type="button">header</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('footer')} type="button">footer</button>

              {/* 平台前缀 */}
              <button class={styles['quick-tag']} onClick={() => setPrefix('mobile')} type="button">mobile</button>
              <button class={styles['quick-tag']} onClick={() => setPrefix('desktop')} type="button">desktop</button>
            </div>
          </div>
        )}

        {/* 后缀输入框 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>后缀</span>
          <div
            style={{
              width: '36px',
              height: '22px',
              backgroundColor: showSuffix ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
              borderRadius: '48px',
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              const newValue = !showSuffix
              setShowSuffix(newValue)
              // 如果打开开关，延迟滚动到后缀输入框可见区域（包含快捷词）
              if (newValue) {
                setTimeout(() => {
                  const suffixInput = scrollableRef.current?.querySelector('input[placeholder="请输入后缀名"]')
                  if (suffixInput) {
                    // 使用 center 确保输入框和下方的快捷词都可见
                    suffixInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '50%',
                left: showSuffix ? '17px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        </div>

        {showSuffix && (
          <Fragment>
            <div class={`${styles['form-group']} ${styles['form-group--after-switch']}`}>
              <div class={styles['input-with-clear']}>
                <Textbox
                  onValueInput={setSuffix}
                  placeholder="请输入后缀名"
                  value={suffix}
                />
                {suffix && (
                  <Fragment>
                    <button
                      class={styles['copy-button']}
                      onClick={(e) => {
                        handleCopy(suffix)
                        // 延迟移除焦点，避免干扰复制操作
                        setTimeout(() => {
                          e.currentTarget.blur()
                        }, 0)
                      }}
                      type="button"
                      aria-label="复制"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                        <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      class={styles['clear-button']}
                      onClick={() => setSuffix('')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </Fragment>
                )}
              </div>
              {/* 快捷词标签 */}
              <div class={styles['quick-tags']}>
                {/* 原有标签 */}
                <button class={styles['quick-tag']} onClick={() => setSuffix('default')} type="button">default</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('dark')} type="button">dark</button>

                {/* 样式变体 */}
                <button class={styles['quick-tag']} onClick={() => setSuffix('primary')} type="button">primary</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('secondary')} type="button">secondary</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('light')} type="button">light</button>

                {/* 尺寸缩写 */}
                <button class={styles['quick-tag']} onClick={() => setSuffix('sm')} type="button">sm</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('md')} type="button">md</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('lg')} type="button">lg</button>

                {/* 状态 */}
                <button class={styles['quick-tag']} onClick={() => setSuffix('active')} type="button">active</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('selected')} type="button">selected</button>

                {/* 布局方向 */}
                <button class={styles['quick-tag']} onClick={() => setSuffix('vertical')} type="button">vertical</button>
                <button class={styles['quick-tag']} onClick={() => setSuffix('horizontal')} type="button">horizontal</button>
              </div>
            </div>
          </Fragment>
        )}

        {/* 自动编号选项 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>添加起始编号</span>
          <div
            style={{
              width: '36px',
              height: '22px',
              backgroundColor: addNumber ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
              borderRadius: '48px',
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              const newValue = !addNumber
              setAddNumber(newValue)
              // 如果打开开关，延迟滚动到起始编号输入框可见区域
              if (newValue) {
                setTimeout(() => {
                  const startNumberInput = scrollableRef.current?.querySelector('input[placeholder="1"]')
                  if (startNumberInput) {
                    // 使用 center 确保输入框在视口中可见
                    startNumberInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '50%',
                left: addNumber ? '17px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        </div>

        {addNumber && (
          <Fragment>
            <div class={`${styles['form-group']} ${styles['form-group--after-switch']}`}>
              <div class={styles['input-with-clear']}>
                <Textbox
                  onValueInput={setStartNumber}
                  placeholder="1"
                  value={startNumber}
                />
                {startNumber !== '1' && (
                  <Fragment>
                    <button
                      class={styles['copy-button']}
                      onClick={(e) => {
                        handleCopy(startNumber)
                        // 延迟移除焦点，避免干扰复制操作
                        setTimeout(() => {
                          e.currentTarget.blur()
                        }, 0)
                      }}
                      type="button"
                      aria-label="复制"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1Z" fill="currentColor"/>
                        <path d="M20 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H20C21.1 23 22 22.1 22 21V7C22 5.9 21.1 5 20 5ZM20 21H8V7H20V21Z" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      class={styles['clear-button']}
                      onClick={() => setStartNumber('1')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </Fragment>
                )}
              </div>
            </div>
          </Fragment>
        )}
        </Fragment>
        )}

        {/* 切图命名表单 */}
        {currentMode === 'export' && (
          <div class={styles['export-form']}>
            {/* 5. 名称/功能 - 移到最上面 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>名称/功能</label>
              <div class={styles['input-with-clear']}>
                <Textbox
                  onValueInput={(value) => {
                    setExportName(value)
                    // 检测用户是否手动编辑了名称
                    if (value !== selectedLayerName) {
                      setHasManuallyEditedName(true)
                    } else {
                      setHasManuallyEditedName(false)
                    }
                  }}
                  placeholder="请输入名称/功能"
                  value={exportName}
                />
                {exportName && (
                  <button
                    class={styles['clear-button']}
                    onClick={() => {
                      setExportName('')
                      setHasManuallyEditedName(false)
                      setHasAutoFilled(false)  // 重置自动填充标记
                    }}
                    type="button"
                    aria-label="清空"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                      <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
              </div>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportName === 'arrow' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('arrow'); setHasManuallyEditedName(true); setHasAutoFilled(false); }} type="button">arrow</button>
                <button class={`${styles['quick-tag']} ${exportName === 'label' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('label'); setHasManuallyEditedName(true); }} type="button">label</button>
                <button class={`${styles['quick-tag']} ${exportName === 'mask' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('mask'); setHasManuallyEditedName(true); }} type="button">mask</button>
                <button class={`${styles['quick-tag']} ${exportName === 'bg' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('bg'); setHasManuallyEditedName(true); }} type="button">bg</button>
                <button class={`${styles['quick-tag']} ${exportName === 'btn' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('btn'); setHasManuallyEditedName(true); }} type="button">btn</button>
                <button class={`${styles['quick-tag']} ${exportName === 'index' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('index'); setHasManuallyEditedName(true); }} type="button">index</button>
                <button class={`${styles['quick-tag']} ${exportName === 'search' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('search'); setHasManuallyEditedName(true); }} type="button">search</button>
                <button class={`${styles['quick-tag']} ${exportName === 'itemlist' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('itemlist'); setHasManuallyEditedName(true); }} type="button">itemlist</button>
                <button class={`${styles['quick-tag']} ${exportName === 'itemdetail' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('itemdetail'); setHasManuallyEditedName(true); }} type="button">itemdetail</button>
                <button class={`${styles['quick-tag']} ${exportName === 'shoppingcart' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('shoppingcart'); setHasManuallyEditedName(true); }} type="button">shoppingcart</button>
                <button class={`${styles['quick-tag']} ${exportName === 'pay' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('pay'); setHasManuallyEditedName(true); }} type="button">pay</button>
                <button class={`${styles['quick-tag']} ${exportName === 'order' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('order'); setHasManuallyEditedName(true); }} type="button">order</button>
                <button class={`${styles['quick-tag']} ${exportName === 'account' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('account'); setHasManuallyEditedName(true); }} type="button">account</button>
                <button class={`${styles['quick-tag']} ${exportName === 'myfavor' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('myfavor'); setHasManuallyEditedName(true); }} type="button">myfavor</button>
                <button class={`${styles['quick-tag']} ${exportName === 'login' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('login'); setHasManuallyEditedName(true); }} type="button">login</button>
                <button class={`${styles['quick-tag']} ${exportName === 'share' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('share'); setHasManuallyEditedName(true); }} type="button">share</button>
                <button class={`${styles['quick-tag']} ${exportName === 'popup' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('popup'); setHasManuallyEditedName(true); }} type="button">popup</button>
                <button class={`${styles['quick-tag']} ${exportName === 'banner' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('banner'); setHasManuallyEditedName(true); }} type="button">banner</button>
                <button class={`${styles['quick-tag']} ${exportName === 'delete' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('delete'); setHasManuallyEditedName(true); }} type="button">delete</button>
                <button class={`${styles['quick-tag']} ${exportName === 'loading' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('loading'); setHasManuallyEditedName(true); }} type="button">loading</button>
                <button class={`${styles['quick-tag']} ${exportName === 'sort' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('sort'); setHasManuallyEditedName(true); }} type="button">sort</button>
                <button class={`${styles['quick-tag']} ${exportName === 'close' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('close'); setHasManuallyEditedName(true); }} type="button">close</button>
                <button class={`${styles['quick-tag']} ${exportName === 'add' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('add'); setHasManuallyEditedName(true); }} type="button">add</button>
                <button class={`${styles['quick-tag']} ${exportName === 'collect' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('collect'); setHasManuallyEditedName(true); }} type="button">collect</button>
                <button class={`${styles['quick-tag']} ${exportName === 'refresh' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('refresh'); setHasManuallyEditedName(true); }} type="button">refresh</button>
                <button class={`${styles['quick-tag']} ${exportName === 'filter' ? styles['quick-tag--selected'] : ''}`} onClick={() => { setExportName('filter'); setHasManuallyEditedName(true); }} type="button">filter</button>
              </div>
            </div>

            {/* 2. 图标/图片 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>图标/图片</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportType === 'icon' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportType(exportType === 'icon' ? '' : 'icon')} type="button">icon</button>
                <button class={`${styles['quick-tag']} ${exportType === 'pic' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportType(exportType === 'pic' ? '' : 'pic')} type="button">pic</button>
              </div>
            </div>

            {/* 3. 风格 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>风格</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportStyle === 'line' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportStyle(exportStyle === 'line' ? '' : 'line')} type="button">line</button>
                <button class={`${styles['quick-tag']} ${exportStyle === 'planarity' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportStyle(exportStyle === 'planarity' ? '' : 'planarity')} type="button">planarity</button>
                <button class={`${styles['quick-tag']} ${exportStyle === 'color' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportStyle(exportStyle === 'color' ? '' : 'color')} type="button">color</button>
              </div>
            </div>

            {/* 4. 类型 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>类型</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportCategory === 'direction' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportCategory(exportCategory === 'direction' ? '' : 'direction')} type="button">direction</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'edit' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportCategory(exportCategory === 'edit' ? '' : 'edit')} type="button">edit</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'alert' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportCategory(exportCategory === 'alert' ? '' : 'alert')} type="button">alert</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'generality' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportCategory(exportCategory === 'generality' ? '' : 'generality')} type="button">generality</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'column' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportCategory(exportCategory === 'column' ? '' : 'column')} type="button">column</button>
              </div>
            </div>

            {/* 6. 状态（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>状态（选填）</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: showState ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showState
                  setShowState(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const stateInput = scrollableRef.current?.querySelector('input[placeholder="请输入状态"]') as HTMLInputElement
                      if (stateInput) {
                        stateInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: showState ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
            {showState && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportState}
                    placeholder="请输入状态"
                    value={exportState}
                  />
                  {exportState && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportState('')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div class={styles['quick-tags']}>
                  <button class={`${styles['quick-tag']} ${exportState === 'up' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'up' ? '' : 'up')} type="button">up</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'down' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'down' ? '' : 'down')} type="button">down</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'left' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'left' ? '' : 'left')} type="button">left</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'right' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'right' ? '' : 'right')} type="button">right</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'top' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'top' ? '' : 'top')} type="button">top</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'bottom' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'bottom' ? '' : 'bottom')} type="button">bottom</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'center' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'center' ? '' : 'center')} type="button">center</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'normal' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'normal' ? '' : 'normal')} type="button">normal</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'selected' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'selected' ? '' : 'selected')} type="button">selected</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'disabled' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'disabled' ? '' : 'disabled')} type="button">disabled</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'pressed' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'pressed' ? '' : 'pressed')} type="button">pressed</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'slide' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'slide' ? '' : 'slide')} type="button">slide</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'error' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'error' ? '' : 'error')} type="button">error</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'success' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'success' ? '' : 'success')} type="button">success</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'complete' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'complete' ? '' : 'complete')} type="button">complete</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'blank' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportState(exportState === 'blank' ? '' : 'blank')} type="button">blank</button>
                </div>
              </div>
            )}

            {/* 7. 颜色（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>颜色（选填）</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: showColor ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showColor
                  setShowColor(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const colorInput = scrollableRef.current?.querySelector('input[placeholder="请输入颜色"]') as HTMLInputElement
                      if (colorInput) {
                        colorInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: showColor ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
            {showColor && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportColor}
                    placeholder="请输入颜色"
                    value={exportColor}
                  />
                  {exportColor && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportColor('')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div class={styles['quick-tags']}>
                  <button class={`${styles['quick-tag']} ${exportColor === 'black' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'black' ? '' : 'black')} type="button">black</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'darkgrey' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'darkgrey' ? '' : 'darkgrey')} type="button">darkgrey</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'lightgrey' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'lightgrey' ? '' : 'lightgrey')} type="button">lightgrey</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'brand5' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'brand5' ? '' : 'brand5')} type="button">brand5</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'red' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'red' ? '' : 'red')} type="button">red</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'blue' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'blue' ? '' : 'blue')} type="button">blue</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'orange' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'orange' ? '' : 'orange')} type="button">orange</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'green' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'green' ? '' : 'green')} type="button">green</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'purple' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'purple' ? '' : 'purple')} type="button">purple</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'white' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportColor(exportColor === 'white' ? '' : 'white')} type="button">white</button>
                </div>
              </div>
            )}

            {/* 8. 尺寸（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>尺寸（选填）</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: showSize ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showSize
                  setShowSize(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const sizeInput = scrollableRef.current?.querySelector('input[placeholder="请输入尺寸"]') as HTMLInputElement
                      if (sizeInput) {
                        sizeInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: showSize ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
            {showSize && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportSize}
                    placeholder="请输入尺寸"
                    value={exportSize}
                  />
                  {exportSize && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportSize('')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div class={styles['quick-tags']}>
                  <button class={`${styles['quick-tag']} ${exportSize === '8' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '8' ? '' : '8')} type="button">8</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '12' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '12' ? '' : '12')} type="button">12</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '14' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '14' ? '' : '14')} type="button">14</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '16' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '16' ? '' : '16')} type="button">16</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '18' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '18' ? '' : '18')} type="button">18</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '24' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '24' ? '' : '24')} type="button">24</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '32' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportSize(exportSize === '32' ? '' : '32')} type="button">32</button>
                </div>
              </div>
            )}

            {/* 9. 透明度（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>透明度（选填）</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: showOpacity ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showOpacity
                  setShowOpacity(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const opacityInput = scrollableRef.current?.querySelector('input[placeholder="请输入透明度"]') as HTMLInputElement
                      if (opacityInput) {
                        opacityInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: showOpacity ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
            {showOpacity && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportOpacity}
                    placeholder="请输入透明度"
                    value={exportOpacity}
                  />
                  {exportOpacity && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportOpacity('')}
                      type="button"
                      aria-label="清空"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 17H11V10H13V17Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22 7H20V22H4V7H2V5H22V7ZM6 20H18V7H6V20Z" fill="currentColor"/>
                        <path d="M17 4H7V2H17V4Z" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div class={styles['quick-tags']}>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '4%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '4%' ? '' : '4%')} type="button">4%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '8%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '8%' ? '' : '8%')} type="button">8%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '16%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '16%' ? '' : '16%')} type="button">16%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '24%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '24%' ? '' : '24%')} type="button">24%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '50%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '50%' ? '' : '50%')} type="button">50%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '60%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '60%' ? '' : '60%')} type="button">60%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '85%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '85%' ? '' : '85%')} type="button">85%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '95%' ? styles['quick-tag--selected'] : ''}`} onClick={() => setExportOpacity(exportOpacity === '95%' ? '' : '95%')} type="button">95%</button>
                </div>
              </div>
            )}

            {/* 1. 年轻版前缀开关 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>年轻版前缀 y_</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: useYoungPrefix ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => setUseYoungPrefix(!useYoungPrefix)}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: useYoungPrefix ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>

            {/* 10. 深色模式后缀（选填）- 使用开关 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>深色模式后缀 _dk</span>
              <div
                style={{
                  width: '36px',
                  height: '22px',
                  backgroundColor: useDarkMode ? '#FF77E7' : 'rgba(27, 27, 27, 0.16)',
                  borderRadius: '48px',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => setUseDarkMode(!useDarkMode)}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '50%',
                    left: useDarkMode ? '17px' : '3px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 分隔线 */}
      <div class={styles['divider']}></div>

      {/* 按钮组：固定在底部 */}
      <div class={styles['button-group']}>
        <button
          class={styles['button-secondary']}
          onClick={handleReset}
        >
          重置
        </button>
        <button
          class={styles['button-primary']}
          onClick={handleApplyRename}
        >
          应用
        </button>
      </div>

      {/* 版权信息 */}
      <div class={styles['copyright-section']}>
        <span class={styles['copyright-text']}>
          Copyright © 2026{' '}
          <a
            href="https://www.figma.com/@asialin"
            target="_blank"
            rel="noopener noreferrer"
            class={styles['copyright-link']}
          >
            Asialin
          </a>
        </span>
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div class={`${styles['toast']} ${!toastMessage.includes('请先选中') && !toastMessage.includes('请先选择') ? styles['toast--success'] : styles['toast--error']}`}>
          {/* 成功提示：显示打勾图标 */}
          {!toastMessage.includes('请先选中') && !toastMessage.includes('请先选择') && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
            </svg>
          )}
          {/* 错误提示：显示打叉图标 */}
          {(toastMessage.includes('请先选中') || toastMessage.includes('请先选择')) && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

export default render(Plugin)
