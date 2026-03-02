/**
 * 批量重命名配置项
 */
export interface RenameOptions {
  renameValue: string  // 新名称（重命名输入框）
  prefix: string       // 前缀（前缀输入框）
  suffix: string       // 后缀（后缀输入框）
  startNumber: number  // 起始编号
  addNumber: boolean   // 是否添加编号
  showPrefix: boolean  // 是否显示前缀
  showSuffix: boolean  // 是否显示后缀
  preserveOriginalName?: boolean  // 是否保留原有名称（切图模式用）
}

/**
 * 切图命名配置项
 */
export interface ExportOptions {
  useYoungPrefix: boolean    // 是否使用年轻版前缀 (y_)
  exportType: string         // 切图类型：icon | pic
  style: string             // 风格：line | planarity | color
  category: string          // 类型：direction | edit | alert | generality | column
  name?: string            // 名称/功能（UI 预览用，main.ts 直接使用 node.name）
  state: string            // 状态（可选）
  color: string            // 颜色（可选）
  size: string             // 尺寸（可选）
  opacity: string           // 透明度（可选）
  useDarkMode: boolean     // 是否使用深色模式后缀 _dk
}
