<template>
  <div class="custom-pdf-viewer" ref="viewerContainer">
    <div v-if="loading" class="pdf-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在自研解析 PDF ({{ loadedPages }}/{{ totalPages }})...</p>
    </div>
    
    <div v-else-if="errorMsg" class="pdf-error">
      <el-result icon="error" title="PDF 解析失败" :sub-title="errorMsg"></el-result>
    </div>

    <!-- 渲染所有的 PDF 页面 -->
    <div class="pdf-pages-container" v-else>
      <div 
        v-for="page in pages" 
        :key="page.pageNumber" 
        class="pdf-page-wrapper"
      >
        <canvas :id="`pdf-canvas-${page.pageNumber}`"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
// 修改引入方式，解决 Vite 构建时的 CJS/ESM 冲突
import * as pdfjsLib from 'pdfjs-dist/build/pdf'

// 设置 worker 路径
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['error'])

const loading = ref(false)
const errorMsg = ref('')
const totalPages = ref(0)
const loadedPages = ref(0)
const pages = ref([])

const renderPdf = async (url) => {
  if (!url || url.startsWith('mock_url')) return
  
  loading.value = true
  errorMsg.value = ''
  loadedPages.value = 0
  pages.value = []

  try {
    // 1. 获取 PDF 文档对象
    const loadingTask = pdfjsLib.getDocument(url)
    const pdfDoc = await loadingTask.promise
    totalPages.value = pdfDoc.numPages

    // 2. 准备页面占位数据
    for (let i = 1; i <= totalPages.value; i++) {
      pages.value.push({ pageNumber: i })
    }

    // 等待 DOM 里的 canvas 节点挂载完毕
    await nextTick()

    // 3. 逐页渲染（为了性能，此处演示串行渲染。生产环境可做懒加载）
    for (let i = 1; i <= totalPages.value; i++) {
      const page = await pdfDoc.getPage(i)
      
      // 设置缩放比例，保证清晰度
      const scale = 1.5 
      const viewport = page.getViewport({ scale })

      // 获取对应的 Canvas
      const canvas = document.getElementById(`pdf-canvas-${i}`)
      if (!canvas) continue

      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width

      // 将 PDF 页面渲染到 Canvas 上
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      loadedPages.value = i
    }
  } catch (err) {
    console.error('PDF 解析失败:', err)
    errorMsg.value = err.message || '未知解析错误'
    emit('error', err)
  } finally {
    loading.value = false
  }
}

// 监听 URL 变化，重新渲染
watch(() => props.src, (newUrl) => {
  if (newUrl) {
    renderPdf(newUrl)
  }
}, { immediate: true })

</script>

<style scoped>
.custom-pdf-viewer {
  width: 100%;
  min-height: 800px;
  background-color: #525659;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  position: relative;
}

.pdf-loading, .pdf-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  text-align: center;
}

.pdf-loading .el-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.pdf-pages-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  width: 100%;
}

.pdf-page-wrapper {
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  background-color: #fff;
}

.pdf-page-wrapper canvas {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>