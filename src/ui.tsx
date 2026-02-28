import {
  render,
  Textbox
} from '@create-figma-plugin/ui'
import { h, Fragment } from 'preact'
import { useCallback, useState, useEffect, useMemo, useRef } from 'preact/hooks'

import './yds-variables.css'
import styles from './styles.css'
import { RenameOptions, ExportOptions } from './types'
import { Locale, getTranslation, LOCALE_CONFIGS, PLACEHOLDERS } from './i18n'

// 主题类型
type Theme = 'light' | 'dark' | 'auto'

function Plugin() {
  // 语言状态
  const [locale, setLocale] = useState<Locale>('zh-CN')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDropdownClosing, setIsDropdownClosing] = useState(false)
  const t = useMemo(() => getTranslation(locale), [locale])

  // 主题状态
  const [theme, setTheme] = useState<Theme>('light')
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)
  const [isThemeDropdownClosing, setIsThemeDropdownClosing] = useState(false)
  const [systemIsDark, setSystemIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // 计算实际主题（auto 时根据系统判断）
  const getActualTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'auto') {
      return systemIsDark ? 'dark' : 'light'
    }
    return theme
  }, [theme, systemIsDark])

  // 获取当前主题的显示名称
  const getThemeDisplayName = useCallback((): string => {
    const actualTheme = getActualTheme()
    if (theme === 'light') return t.theme.light
    if (theme === 'dark') return t.theme.dark
    return t.theme.auto
  }, [theme, getActualTheme, t.theme])

  // 关闭语言下拉菜单（带动画）
  const closeDropdown = () => {
    setIsDropdownClosing(true)
    setTimeout(() => {
      setIsDropdownOpen(false)
      setIsDropdownClosing(false)
    }, 150)
  }

  // 关闭主题下拉菜单（带动画）
  const closeThemeDropdown = () => {
    setIsThemeDropdownClosing(true)
    setTimeout(() => {
      setIsThemeDropdownOpen(false)
      setIsThemeDropdownClosing(false)
    }, 150)
  }

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
  const [currentMode, setCurrentMode] = useState<'layer' | 'slice'>('layer')

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

  const scrollableRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<number | null>(null)
  const hasManuallyEditedNameRef = useRef(false)  // 使用 ref 避免闭包陷阱
  const hasAutoFilledRef = useRef(false)  // 使用 ref 避免闭包陷阱
  const userClearedInputRef = useRef(false)  // 追踪用户是否主动清空了输入框
  const [isToastShowing, setIsToastShowing] = useState(false)
  const [isToastError, setIsToastError] = useState(false)  // 追踪 toast 是否为错误类型
  const [isSticky, setIsSticky] = useState(false)  // 追踪预览区域是否处于 sticky 状态

  // 同步 hasManuallyEditedName 到 ref
  useEffect(() => {
    hasManuallyEditedNameRef.current = hasManuallyEditedName
  }, [hasManuallyEditedName])

  // 翻译预览中的占位符文本
  const translatePlaceholder = useCallback((text: string): string => {
    if (text === PLACEHOLDERS.SELECT_NAME_FUNCTION) {
      return t.messages.selectNameFunction
    }
    if (text === PLACEHOLDERS.SELECT_LAYERS_FIRST) {
      return t.messages.selectLayersFirst
    }
    return text
  }, [t])

  // 显示 toast 的通用函数
  const showToastMessage = useCallback(function (message: string, isError: boolean = false) {
    // 如果toast已经在显示中，不重复显示
    if (isToastShowing) {
      return
    }

    // 清除之前的定时器
    if (toastTimer.current !== null) {
      clearTimeout(toastTimer.current)
    }

    setToastMessage(message)
    setIsToastError(isError)
    setShowToast(true)
    setIsToastShowing(true)

    // 设置新的定时器
    toastTimer.current = window.setTimeout(() => {
      setShowToast(false)
      setIsToastShowing(false)
      setIsToastError(false)
      toastTimer.current = null
    }, 2000)
  }, [isToastShowing])

  // 复制到剪贴板的函数
  const handleCopy = useCallback(async function (text: string) {
    if (text) {
      try {
        // 优先使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          showToastMessage(t.messages.copied)
        } else {
          // 降级方案：使用 execCommand（兼容旧环境）
          const textarea = document.createElement('textarea')
          textarea.value = text
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()

          const successful = document.execCommand('copy')
          if (successful) {
            showToastMessage(t.messages.copied)
          }

          document.body.removeChild(textarea)
        }
      } catch (err) {
        console.error('复制失败:', err)
      }
    }
  }, [showToastMessage, t.messages.copied])

  // 快捷词标签点击处理函数（需要检查选择状态，支持切换）
  const handleQuickTagToggle = useCallback(function (
    value: string,
    currentValue: string,
    setter: (value: string) => void,
    options?: { setManuallyEdited?: boolean }
  ) {
    if (selectionCount === 0) {
      showToastMessage(t.messages.selectLayersFirst, true)
      return
    }
    setter(currentValue === value ? '' : value)
    if (options?.setManuallyEdited) {
      setHasManuallyEditedName(true)
    }
  }, [selectionCount, showToastMessage, t.messages.selectLayersFirst])

  // 快捷词标签点击处理函数（直接设置值，不切换）
  const handleQuickTagSet = useCallback(function (
    value: string,
    setter: (value: string) => void
  ) {
    setter(value)
  }, [])

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

    if (!name) return PLACEHOLDERS.SELECT_NAME_FUNCTION

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

          // 取消选中图层：清空输入框，恢复默认态
          if (count === 0) {
            setExportName('')
            setRenameValue('')
            setAllSelectedNames([])
            hasAutoFilledRef.current = false
            setHasManuallyEditedName(false)
            hasManuallyEditedNameRef.current = false
          }
          // 切图模式：单个图层时自动填充图层名称到输入框
          else if (currentMode === 'slice' && count === 1 && selectedName) {
            // 检测是否选中了新的图层（图层名称发生变化）
            const isLayerChanged = selectedName !== selectedLayerName

            if (isLayerChanged) {
              // 选中了新图层：重置所有标记并自动填充新名称
              setExportName(selectedName)
              hasAutoFilledRef.current = true
              hasManuallyEditedNameRef.current = true
              setHasManuallyEditedName(true)
              userClearedInputRef.current = false
            }
            // 如果是同一个图层，保持用户当前的编辑状态（不做任何操作）
          }
          // 图层命名模式：自动填充原有名称到输入框
          else if (currentMode === 'layer' && selectedName) {
            if (!hasManuallyEditedNameRef.current || renameValue === selectedLayerName) {
              setRenameValue(selectedName)
              hasAutoFilledRef.current = true
              hasManuallyEditedNameRef.current = true
              setHasManuallyEditedName(true)
            }
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
  }, [currentMode])  // 只在模式切换时重新注册

  // 计算预览名称
  const previewName = useMemo(() => {
    if (currentMode === 'slice') {
      // 切图命名模式：先检查是否选中图层
      if (selectionCount === 0) return PLACEHOLDERS.SELECT_LAYERS_FIRST

      // 生成切图名称
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
      if (!selectedLayerName) return PLACEHOLDERS.SELECT_LAYERS_FIRST

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
  }, [currentMode, selectedLayerName, renameValue, prefix, suffix, startNumber, addNumber, showPrefix, showSuffix, useYoungPrefix, exportType, exportStyle, exportCategory, exportName, exportState, exportColor, exportSize, exportOpacity, useDarkMode, showState, showColor, showSize, showOpacity, generateExportName, selectionCount])

  // 处理应用按钮点击
  const handleApplyRename = useCallback(function () {
    // 两种模式都需要检查是否选中了图层
    if (selectionCount === 0) {
      showToastMessage(t.messages.selectLayersFirst, true)
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
      showToastMessage(t.messages.renamed)
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
        showToastMessage(t.messages.renamed)
      } else {
        // 使用统一名称：需要检查是否选择了名称/功能
        if (name && name !== PLACEHOLDERS.SELECT_NAME_FUNCTION) {
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
          showToastMessage(t.messages.renamed)
        } else {
          showToastMessage(t.messages.selectNameFunction, true)
        }
      }
    }
  }, [currentMode, renameValue, prefix, suffix, startNumber, addNumber, showPrefix, showSuffix, previewName, showToastMessage, selectionCount, hasManuallyEditedName, useYoungPrefix, exportType, exportStyle, exportCategory, exportState, exportColor, exportSize, exportOpacity, useDarkMode, showState, showColor, showSize, showOpacity, t.messages])

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

  // 监听滚动，检测预览区域是否处于 sticky 状态
  useEffect(() => {
    const scrollable = scrollableRef.current
    if (!scrollable) return

    const handleScroll = () => {
      // 当滚动距离大于 0 时，预览区域处于 sticky 状态
      setIsSticky(scrollable.scrollTop > 0)
    }

    // 初始检查
    handleScroll()

    scrollable.addEventListener('scroll', handleScroll)
    return () => {
      scrollable.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 主题切换时更新 CSS 变量
  useEffect(() => {
    const actualTheme = getActualTheme()
    document.documentElement.setAttribute('data-theme', actualTheme)
  }, [theme, getActualTheme])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches)
      // 如果是 auto 模式，更新 data-theme
      if (theme === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // 点击外部关闭语言下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`.${styles['language-selector']}`)) {
        closeDropdown()
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isDropdownOpen])

  // 点击外部关闭主题下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`.${styles['theme-selector']}`)) {
        closeThemeDropdown()
      }
    }

    if (isThemeDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isThemeDropdownOpen])

  return (
    <div class={styles['plugin-container']}>
      {/* 可滚动内容区域 */}
      <div class={styles['scrollable-content']} ref={scrollableRef}>
        {/* 预览区域（包含选项卡） */}
        <div class={`${styles['preview-section']} ${isSticky ? styles['preview-section--sticky'] : ''}`}>
          {/* 选项卡和语言切换 */}
          <div class={styles['preview-header']}>
            {/* 选项卡切换 */}
            <div class={styles['mode-tabs']}>
              <button
                class={`${styles['mode-tab']} ${currentMode === 'layer' ? styles['mode-tab--active'] : ''}`}
                onClick={() => { setCurrentMode('layer'); hasAutoFilledRef.current = false; setHasManuallyEditedName(false); hasManuallyEditedNameRef.current = false; userClearedInputRef.current = false }}
                type="button"
              >
                {t.tabs.layer}
              </button>
              <button
                class={`${styles['mode-tab']} ${currentMode === 'slice' ? styles['mode-tab--active'] : ''}`}
                onClick={() => { setCurrentMode('slice'); hasAutoFilledRef.current = false; setHasManuallyEditedName(false); hasManuallyEditedNameRef.current = false; userClearedInputRef.current = false }}
                type="button"
              >
                {t.tabs.slice}
              </button>
            </div>

            {/* 主题选择器 */}
            <div class={styles['theme-selector']}>
              <button
                class={`${styles['theme-button']} ${isThemeDropdownOpen ? styles['theme-button--open'] : ''}`}
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                type="button"
              >
                {/* 动态图标：浅色模式显示太阳，深色模式显示月亮 */}
                {getActualTheme() === 'light' ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['theme-icon']}>
                    <circle cx="12" cy="12" r="5" fill="currentColor"/>
                    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['theme-icon']}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
                  </svg>
                )}
                <span class={styles['theme-tooltip']}>{getThemeDisplayName()}</span>
              </button>
              {isThemeDropdownOpen && (
                <div class={`${styles['theme-dropdown']} ${isThemeDropdownClosing ? styles['theme-dropdown--closing'] : ''}`}>
                  {/* 浅色模式 - 太阳图标 */}
                  <button
                    class={`${styles['theme-option']} ${theme === 'light' ? styles['theme-option--selected'] : ''}`}
                    onClick={() => {
                      setTheme('light')
                      closeThemeDropdown()
                    }}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['theme-option__icon']}>
                      <circle cx="12" cy="12" r="5" fill="currentColor"/>
                      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    {t.theme.light}
                  </button>
                  {/* 深色模式 - 月亮图标 */}
                  <button
                    class={`${styles['theme-option']} ${theme === 'dark' ? styles['theme-option--selected'] : ''}`}
                    onClick={() => {
                      setTheme('dark')
                      closeThemeDropdown()
                    }}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['theme-option__icon']}>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
                    </svg>
                    {t.theme.dark}
                  </button>
                  {/* 跟随系统 - 电脑图标 */}
                  <button
                    class={`${styles['theme-option']} ${theme === 'auto' ? styles['theme-option--selected'] : ''}`}
                    onClick={() => {
                      setTheme('auto')
                      closeThemeDropdown()
                    }}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['theme-option__icon']}>
                      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    {t.theme.auto}
                  </button>
                </div>
              )}
            </div>

            {/* 语言选择器 */}
            <div class={styles['language-selector']}>
              <button
                class={`${styles['language-button']} ${isDropdownOpen ? styles['language-button--open'] : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={styles['globe-icon']}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span class={styles['language-tooltip']}>{LOCALE_CONFIGS.find(c => c.value === locale)?.label}</span>
              </button>
              {isDropdownOpen && (
                <div class={`${styles['language-dropdown']} ${isDropdownClosing ? styles['language-dropdown--closing'] : ''}`}>
                  {LOCALE_CONFIGS.map((config) => (
                    <button
                      key={config.value}
                      class={`${styles['language-option']} ${locale === config.value ? styles['language-option--selected'] : ''}`}
                      onClick={() => {
                        setLocale(config.value)
                        closeDropdown()
                      }}
                      type="button"
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 预览内容 */}
          <div class={styles['preview-box']}>
            <div class={styles['preview-label']}>
              {selectionCount > 0 && (
                <span class={styles['preview-count']}>
                  {t.messages.selectedLayers} <strong>{selectionCount}</strong> {t.messages.layersSuffix}
                </span>
              )}
            </div>
            <div class={`${styles['preview-content']} ${currentMode === 'slice' ? styles['preview-content--vertical'] : ''}`}>
              {currentMode === 'slice' ? (
                // 切图命名模式
                <Fragment>
                  {selectionCount > 1 && !hasManuallyEditedName ? (
                    // 多图层且未手动编辑：显示所有图层的预览列表
                    <div class={styles['preview-list']}>
                      {allSelectedNames.map((name, index) => (
                        <div key={index} class={styles['preview-list-item']}>
                          <div class={styles['preview-list-original']}>{name}</div>
                          <div class={styles['preview-list-arrow']}>→</div>
                          <div class={`${styles['preview-list-new']} ${generateExportNameForLayer(name) !== PLACEHOLDERS.SELECT_NAME_FUNCTION ? styles['preview-new--with-copy'] : ''}`}>
                            <span class={styles['preview-text']}>{translatePlaceholder(generateExportNameForLayer(name))}</span>
                            {generateExportNameForLayer(name) !== PLACEHOLDERS.SELECT_NAME_FUNCTION && generateExportNameForLayer(name) !== PLACEHOLDERS.SELECT_LAYERS_FIRST && (
                              <button
                                class={styles['preview-copy-button']}
                                onClick={(e) => {
                                  handleCopy(generateExportNameForLayer(name))
                                  setTimeout(() => {
                                    e.currentTarget.blur()
                                  }, 0)
                                }}
                                type="button"
                                aria-label="Copy"
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
                      {(selectedLayerName || (previewName && previewName !== PLACEHOLDERS.SELECT_NAME_FUNCTION && previewName !== PLACEHOLDERS.SELECT_LAYERS_FIRST)) ? (
                        <div class={`${styles['preview-new']} ${previewName !== PLACEHOLDERS.SELECT_NAME_FUNCTION && previewName !== PLACEHOLDERS.SELECT_LAYERS_FIRST ? styles['preview-new--with-copy'] : ''}`}>
                          <span class={styles['preview-text']}>{translatePlaceholder(previewName)}</span>
                          {previewName !== PLACEHOLDERS.SELECT_NAME_FUNCTION && previewName !== PLACEHOLDERS.SELECT_LAYERS_FIRST && (
                            <button
                              class={styles['preview-copy-button']}
                              onClick={(e) => {
                                handleCopy(previewName)
                                setTimeout(() => {
                                  e.currentTarget.blur()
                                }, 0)
                              }}
                              type="button"
                              aria-label="Copy"
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
                          {translatePlaceholder(previewName)}
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
                        {translatePlaceholder(previewName)}
                      </div>
                    </Fragment>
                  )}
                  {!selectedLayerName && (
                    <div class={styles['preview-placeholder']}>
                      {translatePlaceholder(previewName)}
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
          <label class={styles['form-label']}>{t.labels.newName}</label>
          <div class={styles['input-with-clear']}>
            <Textbox
              onValueInput={setRenameValue}
              placeholder={t.labels.placeholder.newName}
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
                  aria-label="Copy"
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
                  aria-label="Clear"
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
            {/* 容器/布局 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.containerLayout}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'container' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('container', renameValue, setRenameValue)} type="button">container</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'layout' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('layout', renameValue, setRenameValue)} type="button">layout</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'row' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('row', renameValue, setRenameValue)} type="button">row</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'column' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('column', renameValue, setRenameValue)} type="button">column</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'page' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('page', renameValue, setRenameValue)} type="button">page</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'body' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('body', renameValue, setRenameValue)} type="button">body</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'divider' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('divider', renameValue, setRenameValue)} type="button">divider</button>

            {/* 基础元素 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.basicElements}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'text' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('text', renameValue, setRenameValue)} type="button">text</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'title' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('title', renameValue, setRenameValue)} type="button">title</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'description' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('description', renameValue, setRenameValue)} type="button">description</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'label' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('label', renameValue, setRenameValue)} type="button">label</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'tag' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('tag', renameValue, setRenameValue)} type="button">tag</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'item' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('item', renameValue, setRenameValue)} type="button">item</button>

            {/* UI 组件 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.uiComponents}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'button' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('button', renameValue, setRenameValue)} type="button">button</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'input' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('input', renameValue, setRenameValue)} type="button">input</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'card' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('card', renameValue, setRenameValue)} type="button">card</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'modal' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('modal', renameValue, setRenameValue)} type="button">modal</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'list' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('list', renameValue, setRenameValue)} type="button">list</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'table' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('table', renameValue, setRenameValue)} type="button">table</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'tabs' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('tabs', renameValue, setRenameValue)} type="button">tabs</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'checkbox' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('checkbox', renameValue, setRenameValue)} type="button">checkbox</button>

            {/* 媒体/图形 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.mediaGraphics}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'image' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('image', renameValue, setRenameValue)} type="button">image</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'avatar' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('avatar', renameValue, setRenameValue)} type="button">avatar</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'icon' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('icon', renameValue, setRenameValue)} type="button">icon</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'vector' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('vector', renameValue, setRenameValue)} type="button">vector</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'line' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('line', renameValue, setRenameValue)} type="button">line</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'bg' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('bg', renameValue, setRenameValue)} type="button">bg</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'mask' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('mask', renameValue, setRenameValue)} type="button">mask</button>

            {/* 状态 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.state}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'default' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('default', renameValue, setRenameValue)} type="button">default</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'selected' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('selected', renameValue, setRenameValue)} type="button">selected</button>
            <button class={`${styles['quick-tag']} ${renameValue === 'disabled' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('disabled', renameValue, setRenameValue)} type="button">disabled</button>

            {/* 导航 */}
            <span class={styles['quick-tag-group-title']}>{t.quickTagGroups.navigation}</span>
            <button class={`${styles['quick-tag']} ${renameValue === 'link' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('link', renameValue, setRenameValue)} type="button">link</button>
          </div>
        </div>

        {/* 前缀输入框 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>{t.labels.prefix}</span>
          <div
            class="switch"
            style={{
              width: '38px',
              height: '24px',
              borderRadius: '24px',
              backgroundColor: showPrefix
                ? 'var(--yds-bg-brand-default, #FF77E7)'
                : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
              opacity: selectionCount === 0 ? 0.5 : 1,
              cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              if (selectionCount === 0) {
                showToastMessage(t.messages.selectLayersFirst, true)
                return
              }
              const newValue = !showPrefix
              setShowPrefix(newValue)
              // 如果打开开关，延迟滚动到前缀输入框可见区域（包含快捷词）
              if (newValue) {
                setTimeout(() => {
                  const prefixInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.prefix}"]`)
                  if (prefixInput) {
                    // 使用 center 确保输入框和下方的快捷词都可见
                    prefixInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }
            }}
          >
            <span
              class="switch-dot"
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s ease',
                transform: showPrefix ? 'translateX(14px)' : 'translateX(0)'
              }}
            />
          </div>
        </div>

        {showPrefix && (
          <div class={`${styles['form-group']} ${styles['form-group--after-switch']}`}>
            <div class={styles['input-with-clear']}>
              <Textbox
                onValueInput={setPrefix}
                placeholder={t.labels.placeholder.prefix}
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
                    aria-label="Copy"
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
                    aria-label="Clear"
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
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('active', setPrefix)} type="button">active</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('disabled', setPrefix)} type="button">disabled</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('loading', setPrefix)} type="button">loading</button>

              {/* 尺寸前缀 */}
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('small', setPrefix)} type="button">small</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('medium', setPrefix)} type="button">medium</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('large', setPrefix)} type="button">large</button>

              {/* 位置前缀 */}
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('left', setPrefix)} type="button">left</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('right', setPrefix)} type="button">right</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('header', setPrefix)} type="button">header</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('footer', setPrefix)} type="button">footer</button>

              {/* 平台前缀 */}
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('mobile', setPrefix)} type="button">mobile</button>
              <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('desktop', setPrefix)} type="button">desktop</button>
            </div>
          </div>
        )}

        {/* 后缀输入框 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>{t.labels.suffix}</span>
          <div
            class="switch"
            style={{
              width: '38px',
              height: '24px',
              borderRadius: '24px',
              backgroundColor: showSuffix
                ? 'var(--yds-bg-brand-default, #FF77E7)'
                : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
              opacity: selectionCount === 0 ? 0.5 : 1,
              cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => {
              if (selectionCount === 0) {
                showToastMessage(t.messages.selectLayersFirst, true)
                return
              }
              const newValue = !showSuffix
              setShowSuffix(newValue)
              // 如果打开开关，延迟滚动到后缀输入框可见区域（包含快捷词）
              if (newValue) {
                setTimeout(() => {
                  const suffixInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.suffix}"]`)
                  if (suffixInput) {
                    // 使用 center 确保输入框和下方的快捷词都可见
                    suffixInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }, 100)
              }
            }}
          >
            <span
              class="switch-dot"
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s ease',
                transform: showSuffix ? 'translateX(14px)' : 'translateX(0)'
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
                  placeholder={t.labels.placeholder.suffix}
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
                      aria-label="Copy"
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
                      aria-label="Clear"
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
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('default', setSuffix)} type="button">default</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('dark', setSuffix)} type="button">dark</button>

                {/* 样式变体 */}
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('primary', setSuffix)} type="button">primary</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('secondary', setSuffix)} type="button">secondary</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('light', setSuffix)} type="button">light</button>

                {/* 尺寸缩写 */}
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('sm', setSuffix)} type="button">sm</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('md', setSuffix)} type="button">md</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('lg', setSuffix)} type="button">lg</button>

                {/* 状态 */}
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('active', setSuffix)} type="button">active</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('selected', setSuffix)} type="button">selected</button>

                {/* 布局方向 */}
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('vertical', setSuffix)} type="button">vertical</button>
                <button class={styles['quick-tag']} onClick={() => handleQuickTagSet('horizontal', setSuffix)} type="button">horizontal</button>
              </div>
            </div>
          </Fragment>
        )}

        {/* 自动编号选项 */}
        <div class={styles['switch-container']}>
          <span class={styles['switch-label']}>{t.switches.addStartNumber}</span>
          <div
            class="switch"
            style={{
              width: '38px',
              height: '24px',
              borderRadius: '24px',
              backgroundColor: addNumber
                ? 'var(--yds-bg-brand-default, #FF77E7)'
                : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
              cursor: 'pointer',
              position: 'relative',
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
              class="switch-dot"
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s ease',
                transform: addNumber ? 'translateX(14px)' : 'translateX(0)'
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
                      aria-label="Copy"
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
                      aria-label="Clear"
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
        {currentMode === 'slice' && (
          <div class={styles['export-form']}>
            {/* 5. 名称/功能 - 移到最上面 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>{t.labels.nameFunction}</label>
              <div class={styles['input-with-clear']}>
                <Textbox
                  onValueInput={(value) => {
                    setExportName(value)
                    userClearedInputRef.current = false  // 用户开始输入，重置清空标记
                    hasManuallyEditedNameRef.current = true
                    setHasManuallyEditedName(true)
                  }}
                  placeholder={t.labels.placeholder.nameFunction}
                  value={exportName}
                />
                {exportName && (
                  <Fragment>
                    <button
                      class={styles['clear-button']}
                      onClick={() => {
                        setExportName('')
                        setHasManuallyEditedName(false)
                        hasManuallyEditedNameRef.current = false  // 同步更新 ref
                        hasAutoFilledRef.current = false  // 重置自动填充标记
                        userClearedInputRef.current = true  // 标记用户主动清空
                      }}
                      type="button"
                      aria-label={t.buttons.reset}
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
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportName === 'arrow' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('arrow', exportName, setExportName, { setManuallyEdited: true })} type="button">arrow</button>
                <button class={`${styles['quick-tag']} ${exportName === 'label' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('label', exportName, setExportName, { setManuallyEdited: true })} type="button">label</button>
                <button class={`${styles['quick-tag']} ${exportName === 'mask' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('mask', exportName, setExportName, { setManuallyEdited: true })} type="button">mask</button>
                <button class={`${styles['quick-tag']} ${exportName === 'bg' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('bg', exportName, setExportName, { setManuallyEdited: true })} type="button">bg</button>
                <button class={`${styles['quick-tag']} ${exportName === 'btn' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('btn', exportName, setExportName, { setManuallyEdited: true })} type="button">btn</button>
                <button class={`${styles['quick-tag']} ${exportName === 'index' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('index', exportName, setExportName, { setManuallyEdited: true })} type="button">index</button>
                <button class={`${styles['quick-tag']} ${exportName === 'search' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('search', exportName, setExportName, { setManuallyEdited: true })} type="button">search</button>
                <button class={`${styles['quick-tag']} ${exportName === 'itemlist' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('itemlist', exportName, setExportName, { setManuallyEdited: true })} type="button">itemlist</button>
                <button class={`${styles['quick-tag']} ${exportName === 'itemdetail' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('itemdetail', exportName, setExportName, { setManuallyEdited: true })} type="button">itemdetail</button>
                <button class={`${styles['quick-tag']} ${exportName === 'shoppingcart' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('shoppingcart', exportName, setExportName, { setManuallyEdited: true })} type="button">shoppingcart</button>
                <button class={`${styles['quick-tag']} ${exportName === 'pay' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('pay', exportName, setExportName, { setManuallyEdited: true })} type="button">pay</button>
                <button class={`${styles['quick-tag']} ${exportName === 'order' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('order', exportName, setExportName, { setManuallyEdited: true })} type="button">order</button>
                <button class={`${styles['quick-tag']} ${exportName === 'account' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('account', exportName, setExportName, { setManuallyEdited: true })} type="button">account</button>
                <button class={`${styles['quick-tag']} ${exportName === 'myfavor' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('myfavor', exportName, setExportName, { setManuallyEdited: true })} type="button">myfavor</button>
                <button class={`${styles['quick-tag']} ${exportName === 'login' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('login', exportName, setExportName, { setManuallyEdited: true })} type="button">login</button>
                <button class={`${styles['quick-tag']} ${exportName === 'share' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('share', exportName, setExportName, { setManuallyEdited: true })} type="button">share</button>
                <button class={`${styles['quick-tag']} ${exportName === 'popup' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('popup', exportName, setExportName, { setManuallyEdited: true })} type="button">popup</button>
                <button class={`${styles['quick-tag']} ${exportName === 'banner' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('banner', exportName, setExportName, { setManuallyEdited: true })} type="button">banner</button>
                <button class={`${styles['quick-tag']} ${exportName === 'delete' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('delete', exportName, setExportName, { setManuallyEdited: true })} type="button">delete</button>
                <button class={`${styles['quick-tag']} ${exportName === 'loading' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('loading', exportName, setExportName, { setManuallyEdited: true })} type="button">loading</button>
                <button class={`${styles['quick-tag']} ${exportName === 'sort' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('sort', exportName, setExportName, { setManuallyEdited: true })} type="button">sort</button>
                <button class={`${styles['quick-tag']} ${exportName === 'close' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('close', exportName, setExportName, { setManuallyEdited: true })} type="button">close</button>
                <button class={`${styles['quick-tag']} ${exportName === 'add' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('add', exportName, setExportName, { setManuallyEdited: true })} type="button">add</button>
                <button class={`${styles['quick-tag']} ${exportName === 'collect' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('collect', exportName, setExportName, { setManuallyEdited: true })} type="button">collect</button>
                <button class={`${styles['quick-tag']} ${exportName === 'refresh' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('refresh', exportName, setExportName, { setManuallyEdited: true })} type="button">refresh</button>
                <button class={`${styles['quick-tag']} ${exportName === 'filter' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('filter', exportName, setExportName, { setManuallyEdited: true })} type="button">filter</button>
              </div>
            </div>

            {/* 2. 图标/图片 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>{t.labels.iconImage}</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportType === 'icon' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('icon', exportType, setExportType)} type="button">icon</button>
                <button class={`${styles['quick-tag']} ${exportType === 'pic' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('pic', exportType, setExportType)} type="button">pic</button>
              </div>
            </div>

            {/* 3. 风格 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>{t.labels.style}</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportStyle === 'line' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('line', exportStyle, setExportStyle)} type="button">line</button>
                <button class={`${styles['quick-tag']} ${exportStyle === 'planarity' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('planarity', exportStyle, setExportStyle)} type="button">planarity</button>
                <button class={`${styles['quick-tag']} ${exportStyle === 'color' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('color', exportStyle, setExportStyle)} type="button">color</button>
              </div>
            </div>

            {/* 4. 类型 */}
            <div class={styles['form-group']}>
              <label class={styles['form-label']}>{t.labels.type}</label>
              <div class={styles['quick-tags']}>
                <button class={`${styles['quick-tag']} ${exportCategory === 'direction' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('direction', exportCategory, setExportCategory)} type="button">direction</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'edit' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('edit', exportCategory, setExportCategory)} type="button">edit</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'alert' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('alert', exportCategory, setExportCategory)} type="button">alert</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'generality' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('generality', exportCategory, setExportCategory)} type="button">generality</button>
                <button class={`${styles['quick-tag']} ${exportCategory === 'column' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('column', exportCategory, setExportCategory)} type="button">column</button>
              </div>
            </div>

            {/* 6. 状态（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.stateOptional}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: showState
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showState
                  setShowState(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const stateInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.state}"]`) as HTMLInputElement
                      if (stateInput) {
                        stateInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: showState ? 'translateX(14px)' : 'translateX(0)'
                  }}
                />
              </div>
            </div>
            {showState && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportState}
                    placeholder={t.labels.placeholder.state}
                    value={exportState}
                  />
                  {exportState && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportState('')}
                      type="button"
                      aria-label="Clear"
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
                  <button class={`${styles['quick-tag']} ${exportState === 'up' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('up', exportState, setExportState)} type="button">up</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'down' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('down', exportState, setExportState)} type="button">down</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'left' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('left', exportState, setExportState)} type="button">left</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'right' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('right', exportState, setExportState)} type="button">right</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'top' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('top', exportState, setExportState)} type="button">top</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'bottom' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('bottom', exportState, setExportState)} type="button">bottom</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'center' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('center', exportState, setExportState)} type="button">center</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'default' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('default', exportState, setExportState)} type="button">default</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'selected' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('selected', exportState, setExportState)} type="button">selected</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'normal' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('normal', exportState, setExportState)} type="button">normal</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'disabled' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('disabled', exportState, setExportState)} type="button">disabled</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'pressed' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('pressed', exportState, setExportState)} type="button">pressed</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'slide' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('slide', exportState, setExportState)} type="button">slide</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'error' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('error', exportState, setExportState)} type="button">error</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'success' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('success', exportState, setExportState)} type="button">success</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'complete' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('complete', exportState, setExportState)} type="button">complete</button>
                  <button class={`${styles['quick-tag']} ${exportState === 'blank' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('blank', exportState, setExportState)} type="button">blank</button>
                </div>
              </div>
            )}

            {/* 7. 颜色（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.colorOptional}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: showColor
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showColor
                  setShowColor(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const colorInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.color}"]`) as HTMLInputElement
                      if (colorInput) {
                        colorInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: showColor ? 'translateX(14px)' : 'translateX(0)'
                  }}
                />
              </div>
            </div>
            {showColor && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportColor}
                    placeholder={t.labels.placeholder.color}
                    value={exportColor}
                  />
                  {exportColor && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportColor('')}
                      type="button"
                      aria-label="Clear"
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
                  <button class={`${styles['quick-tag']} ${exportColor === 'black' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('black', exportColor, setExportColor)} type="button">black</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'darkgrey' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('darkgrey', exportColor, setExportColor)} type="button">darkgrey</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'lightgrey' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('lightgrey', exportColor, setExportColor)} type="button">lightgrey</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'brand5' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('brand5', exportColor, setExportColor)} type="button">brand5</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'red' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('red', exportColor, setExportColor)} type="button">red</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'blue' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('blue', exportColor, setExportColor)} type="button">blue</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'orange' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('orange', exportColor, setExportColor)} type="button">orange</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'green' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('green', exportColor, setExportColor)} type="button">green</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'purple' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('purple', exportColor, setExportColor)} type="button">purple</button>
                  <button class={`${styles['quick-tag']} ${exportColor === 'white' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('white', exportColor, setExportColor)} type="button">white</button>
                </div>
              </div>
            )}

            {/* 8. 尺寸（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.sizeOptional}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: showSize
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showSize
                  setShowSize(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const sizeInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.size}"]`) as HTMLInputElement
                      if (sizeInput) {
                        sizeInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: showSize ? 'translateX(14px)' : 'translateX(0)'
                  }}
                />
              </div>
            </div>
            {showSize && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportSize}
                    placeholder={t.labels.placeholder.size}
                    value={exportSize}
                  />
                  {exportSize && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportSize('')}
                      type="button"
                      aria-label="Clear"
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
                  <button class={`${styles['quick-tag']} ${exportSize === '8' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('8', exportSize, setExportSize)} type="button">8</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '12' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('12', exportSize, setExportSize)} type="button">12</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '14' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('14', exportSize, setExportSize)} type="button">14</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '16' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('16', exportSize, setExportSize)} type="button">16</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '18' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('18', exportSize, setExportSize)} type="button">18</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '24' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('24', exportSize, setExportSize)} type="button">24</button>
                  <button class={`${styles['quick-tag']} ${exportSize === '32' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('32', exportSize, setExportSize)} type="button">32</button>
                </div>
              </div>
            )}

            {/* 9. 透明度（选填）- 显示输入框 + 标签 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.opacityOptional}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: showOpacity
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  const newValue = !showOpacity
                  setShowOpacity(newValue)
                  if (newValue) {
                    setTimeout(() => {
                      const opacityInput = scrollableRef.current?.querySelector(`input[placeholder="${t.labels.placeholder.opacity}"]`) as HTMLInputElement
                      if (opacityInput) {
                        opacityInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: showOpacity ? 'translateX(14px)' : 'translateX(0)'
                  }}
                />
              </div>
            </div>
            {showOpacity && (
              <div class={`${styles['form-group']} ${styles['form-group--after-switch--export']}`}>
                <div class={styles['input-with-clear']}>
                  <Textbox
                    onValueInput={setExportOpacity}
                    placeholder={t.labels.placeholder.opacity}
                    value={exportOpacity}
                  />
                  {exportOpacity && (
                    <button
                      class={styles['clear-button']}
                      onClick={() => setExportOpacity('')}
                      type="button"
                      aria-label="Clear"
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
                  <button class={`${styles['quick-tag']} ${exportOpacity === '4%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('4%', exportOpacity, setExportOpacity)} type="button">4%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '8%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('8%', exportOpacity, setExportOpacity)} type="button">8%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '16%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('16%', exportOpacity, setExportOpacity)} type="button">16%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '24%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('24%', exportOpacity, setExportOpacity)} type="button">24%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '50%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('50%', exportOpacity, setExportOpacity)} type="button">50%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '60%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('60%', exportOpacity, setExportOpacity)} type="button">60%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '85%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('85%', exportOpacity, setExportOpacity)} type="button">85%</button>
                  <button class={`${styles['quick-tag']} ${exportOpacity === '95%' ? styles['quick-tag--selected'] : ''}`} onClick={() => handleQuickTagToggle('95%', exportOpacity, setExportOpacity)} type="button">95%</button>
                </div>
              </div>
            )}

            {/* 1. 年轻版前缀开关 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.youngPrefix}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: useYoungPrefix
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  opacity: selectionCount === 0 ? 0.5 : 1,
                  cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  if (selectionCount === 0) {
                    showToastMessage(t.messages.selectLayersFirst, true)
                    return
                  }
                  setUseYoungPrefix(!useYoungPrefix)
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: useYoungPrefix ? 'translateX(14px)' : 'translateX(0)'
                  }}
                />
              </div>
            </div>

            {/* 10. 深色模式后缀（选填）- 使用开关 */}
            <div class={styles['switch-container']}>
              <span class={styles['switch-label']}>{t.switches.darkModeSuffix}</span>
              <div
                class="switch"
                style={{
                  width: '38px',
                  height: '24px',
                  borderRadius: '24px',
                  backgroundColor: useDarkMode
                    ? 'var(--yds-bg-brand-default, #FF77E7)'
                    : 'var(--switch-bg-unchecked, rgba(27, 27, 27, 0.16))',
                  opacity: selectionCount === 0 ? 0.5 : 1,
                  cursor: selectionCount === 0 ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => {
                  if (selectionCount === 0) {
                    showToastMessage(t.messages.selectLayersFirst, true)
                    return
                  }
                  setUseDarkMode(!useDarkMode)
                }}
              >
                <span
                  class="switch-dot"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease',
                    transform: useDarkMode ? 'translateX(14px)' : 'translateX(0)'
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
          {t.buttons.reset}
        </button>
        <button
          class={styles['button-primary']}
          onClick={handleApplyRename}
        >
          {t.buttons.apply}
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
          {' · v1.0.0'}
        </span>
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div class={`${styles['toast']} ${!isToastError ? styles['toast--success'] : styles['toast--error']}`}>
          {/* 成功提示：显示打勾图标 */}
          {!isToastError && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
            </svg>
          )}
          {/* 错误提示：显示打叉图标 */}
          {isToastError && (
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
