<template>
  <div class="custom-excel-viewer">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在解析 Excel 数据...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <el-result icon="error" title="解析失败" :sub-title="error"></el-result>
    </div>

    <div v-else class="excel-container">
      <div class="sheet-tabs">
        <div 
          v-for="(sheet, index) in sheets" 
          :key="index"
          :class="['sheet-tab', { active: activeSheet === index }]"
          @click="activeSheet = index"
        >
          {{ sheet.name }}
        </div>
      </div>
      
      <div class="table-wrapper">
        <table class="excel-table">
          <thead>
            <tr>
              <th class="row-header-corner"></th>
              <th v-for="colIndex in currentMaxCols" :key="colIndex" class="col-header">
                {{ getColumnLabel(colIndex) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in currentSheetData" :key="rowIndex">
              <td class="row-header">{{ rowIndex + 1 }}</td>
              <td v-for="(cell, colIndex) in row" :key="colIndex">
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import JSZip from 'jszip'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['error'])

const loading = ref(false)
const error = ref('')
const sheets = ref([])
const activeSheet = ref(0)

const currentSheetData = computed(() => {
  if (sheets.value.length === 0) return []
  return sheets.value[activeSheet.value].data
})

const currentMaxCols = computed(() => {
  if (currentSheetData.value.length === 0) return 0
  return currentSheetData.value[0].length
})

// 生成 Excel 列字母 (A, B, C, ..., Z, AA, AB...)
const getColumnLabel = (index) => {
  let label = ''
  let temp = index
  while (temp > 0) {
    temp--
    label = String.fromCharCode(65 + (temp % 26)) + label
    temp = Math.floor(temp / 26)
  }
  return label
}

// 解析共享字符串表
const parseSharedStrings = async (zip) => {
  const sharedStringsFile = zip.file('xl/sharedStrings.xml')
  if (!sharedStringsFile) return []
  
  const xmlData = await sharedStringsFile.async('string')
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
  
  const strings = []
  const siNodes = xmlDoc.getElementsByTagName('si')
  for (let i = 0; i < siNodes.length; i++) {
    const tNodes = siNodes[i].getElementsByTagName('t')
    let text = ''
    for (let j = 0; j < tNodes.length; j++) {
      text += tNodes[j].textContent
    }
    strings.push(text)
  }
  return strings
}

// 解析单个 Sheet 数据
const parseSheet = async (zip, sheetPath, sharedStrings) => {
  const sheetFile = zip.file(sheetPath)
  if (!sheetFile) return []

  const xmlData = await sheetFile.async('string')
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlData, 'text/xml')

  const rows = xmlDoc.getElementsByTagName('row')
  const sheetData = []
  
  let maxCols = 0

  // 引入行数限制，防止超大表格导致渲染卡死（虚拟滚动的一种轻量替代）
  const MAX_ROWS_LIMIT = 500
  const rowCount = Math.min(rows.length, MAX_ROWS_LIMIT)

  for (let i = 0; i < rowCount; i++) {
    const rowNode = rows[i]
    // rowNode.getAttribute('r') 是行号，但我们简单按顺序来
    const cells = rowNode.getElementsByTagName('c')
    const rowData = []
    
    let colIndex = 0
    for (let j = 0; j < cells.length; j++) {
      const cellNode = cells[j]
      const type = cellNode.getAttribute('t') // s = shared string
      const r = cellNode.getAttribute('r') // 例: A1, B1
      
      // 简单处理空单元格对齐 (例如直接跳过了A直接到C)
      if (r) {
        const colStr = r.replace(/[0-9]/g, '')
        let targetColIndex = 0
        for (let k = 0; k < colStr.length; k++) {
          targetColIndex = targetColIndex * 26 + (colStr.charCodeAt(k) - 64)
        }
        targetColIndex -= 1
        
        while (colIndex < targetColIndex) {
          rowData.push('')
          colIndex++
        }
      }

      const vNode = cellNode.getElementsByTagName('v')[0]
      let value = vNode ? vNode.textContent : ''

      if (type === 's' && value !== '') {
        value = sharedStrings[parseInt(value)] || value
      }

      rowData.push(value)
      colIndex++
    }
    
    maxCols = Math.max(maxCols, rowData.length)
    sheetData.push(rowData)
  }
  
  // 对齐列数
  sheetData.forEach(row => {
    while (row.length < maxCols) {
      row.push('')
    }
  })

  if (rows.length > MAX_ROWS_LIMIT) {
    sheetData.push([`... (已截断显示，原表共 ${rows.length} 行，建议下载原文件查看完整数据) ...`])
  }

  return sheetData
}

// 增加 AbortController 用于取消未完成的请求
let abortController = null

const loadExcel = async (url) => {
  if (!url || url.startsWith('mock_url')) return

  // 如果有正在进行的请求，先取消它
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  const signal = abortController.signal

  loading.value = true
  error.value = ''
  sheets.value = []
  activeSheet.value = 0

  try {
    const response = await fetch(url, { signal })
    
    // 增加文件大小限制 (例如 10MB)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('文件过大，为了性能考虑，暂不支持在线预览超过 10MB 的 Excel。请下载后查看。')
    }

    const arrayBuffer = await response.arrayBuffer()
    
    const zip = new JSZip()
    try {
      await zip.loadAsync(arrayBuffer)
    } catch (zipErr) {
      throw new Error('文件解压失败，可能不是标准的 XLSX 格式或文件已损坏。')
    }
    
    // 1. 获取工作簿信息
    const workbookFile = zip.file('xl/workbook.xml')
    if (!workbookFile) throw new Error('无效的 Excel 文件，缺少 workbook.xml')
    
    const workbookXml = await workbookFile.async('string')
    const parser = new DOMParser()
    const workbookDoc = parser.parseFromString(workbookXml, 'text/xml')
    
    const sheetNodes = workbookDoc.getElementsByTagName('sheet')
    if (!sheetNodes || sheetNodes.length === 0) {
      throw new Error('未找到任何工作表')
    }
    
    // 2. 获取共享字符串
    const sharedStrings = await parseSharedStrings(zip)
    
    // 3. 解析所有的 sheet
    const parsedSheets = []
    for (let i = 0; i < sheetNodes.length; i++) {
      const name = sheetNodes[i].getAttribute('name')
      const sheetId = i + 1
      const sheetPath = `xl/worksheets/sheet${sheetId}.xml`
      
      const data = await parseSheet(zip, sheetPath, sharedStrings)
      parsedSheets.push({ name, data })
    }
    
    sheets.value = parsedSheets
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Excel loading aborted')
      return // 请求被取消，不需要报错
    }
    console.error('Excel parse error:', err)
    error.value = err.message || '解析失败'
    emit('error', err)
  } finally {
    // 只有当当前的 controller 没有被新的替换时，才重置 loading
    if (abortController && !abortController.signal.aborted) {
      loading.value = false
    }
  }
}

watch(() => props.src, (newVal) => {
  loadExcel(newVal)
})

onMounted(() => {
  loadExcel(props.src)
})
</script>

<style scoped>
.custom-excel-viewer {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #909399;
  flex: 1;
}

.excel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.sheet-tabs {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 10px;
  overflow-x: auto;
}

.sheet-tab {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  border-bottom: 2px solid transparent;
  user-select: none;
}

.sheet-tab:hover {
  color: #409eff;
}

.sheet-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  background: #fff;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  background-color: #f5f5f5; /* 类似 Excel 外围的底色 */
  padding: 0;
}

.excel-table {
  border-collapse: collapse;
  background-color: #fff;
  min-width: 100%;
  table-layout: fixed;
}

.excel-table th, .excel-table td {
  border: 1px solid #d4d4d4; /* Excel 经典灰色边框 */
  padding: 4px 8px;
  min-width: 80px;
  height: 24px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 顶部字母表头 */
.col-header {
  background-color: #f3f3f3;
  color: #444;
  font-weight: normal;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 2px solid #ccc;
  user-select: none;
}

/* 左侧数字行头 */
.row-header {
  background-color: #f3f3f3;
  color: #444;
  font-weight: normal;
  text-align: center;
  position: sticky;
  left: 0;
  z-index: 1;
  width: 40px;
  min-width: 40px;
  border-right: 2px solid #ccc;
  user-select: none;
}

/* 左上角空白格 */
.row-header-corner {
  background-color: #e6e6e6;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 3;
  width: 40px;
  min-width: 40px;
  border-bottom: 2px solid #ccc;
  border-right: 2px solid #ccc;
}

.excel-table td:not(.row-header) {
  color: #000;
  vertical-align: bottom;
}

/* 悬停高亮当前行 */
.excel-table tr:hover td:not(.row-header) {
  background-color: #e8f2fa;
}

.sheet-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #ccc;
  padding: 0;
  overflow-x: auto;
}

.sheet-tab {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  border-right: 1px solid #ccc;
  border-bottom: 3px solid transparent;
  user-select: none;
  background-color: #f9f9f9;
}

.sheet-tab:hover {
  background-color: #f1f1f1;
}

.sheet-tab.active {
  color: #107c41 !important; /* Excel 经典绿 */
  font-weight: bold;
  border-bottom-color: #107c41 !important;
  background: #fff !important;
}
</style>