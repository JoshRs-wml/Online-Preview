<template>
  <div class="custom-docx-viewer">
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在解析 Word 数据...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <el-result icon="error" title="解析失败" :sub-title="error"></el-result>
    </div>

    <div v-else class="docx-container">
      <div class="docx-page">
        <p v-for="(para, index) in paragraphs" :key="index" class="docx-p">
          {{ para }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
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
const paragraphs = ref([])

// 增加 AbortController 用于取消未完成的请求
let abortController = null

const loadDocx = async (url) => {
  if (!url || url.startsWith('mock_url')) return

  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  const signal = abortController.signal

  loading.value = true
  error.value = ''
  paragraphs.value = []

  try {
    const response = await fetch(url, { signal })
    
    // 增加文件大小限制 (例如 20MB)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
      throw new Error('文件过大，为了性能考虑，暂不支持在线预览超过 20MB 的 Word。请下载后查看。')
    }

    const arrayBuffer = await response.arrayBuffer()
    
    const zip = new JSZip()
    try {
      await zip.loadAsync(arrayBuffer)
    } catch (zipErr) {
      throw new Error('文件解压失败，可能不是标准的 DOCX 格式或文件已损坏。')
    }
    
    // DOCX 的核心内容存在 word/document.xml 中
    const docFile = zip.file('word/document.xml')
    if (!docFile) throw new Error('无效的 Word 文件，缺少 document.xml')
    
    const xmlData = await docFile.async('string')
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
    
    // 解析段落
    const pNodes = xmlDoc.getElementsByTagName('w:p')
    const parsedParagraphs = []
    
    // 段落数截断限制
    const MAX_PARAGRAPHS = 2000
    const pCount = Math.min(pNodes.length, MAX_PARAGRAPHS)
    
    for (let i = 0; i < pCount; i++) {
      const tNodes = pNodes[i].getElementsByTagName('w:t')
      let text = ''
      for (let j = 0; j < tNodes.length; j++) {
        text += tNodes[j].textContent
      }
      // 即使是空段落也保留，用于占位换行
      parsedParagraphs.push(text)
    }

    if (pNodes.length > MAX_PARAGRAPHS) {
      parsedParagraphs.push('... (文档过长已截断，建议下载原文件查看完整内容) ...')
    }
    
    paragraphs.value = parsedParagraphs
  } catch (err) {
    if (err.name === 'AbortError') {
      return // 请求被取消
    }
    console.error('Docx parse error:', err)
    error.value = err.message || '解析失败'
    emit('error', err)
  } finally {
    if (abortController && !abortController.signal.aborted) {
      loading.value = false
    }
  }
}

watch(() => props.src, (newVal) => {
  loadDocx(newVal)
})

onMounted(() => {
  loadDocx(props.src)
})
</script>

<style scoped>
.custom-docx-viewer {
  width: 100%;
  height: 100%;
  min-height: 800px;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
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

.docx-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.docx-page {
  background: #fff;
  width: 100%;
  max-width: 800px;
  min-height: 1050px; /* A4 比例粗略估算 */
  padding: 60px 80px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  color: #333;
  line-height: 1.8;
  font-family: "Microsoft YaHei", SimSun, "Segoe UI", sans-serif;
}

.docx-p {
  margin: 0 0 10px 0;
  min-height: 1em; /* 保证空行也有高度 */
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 15px;
}
</style>