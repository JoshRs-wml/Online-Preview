<template>
  <div class="custom-pdf-viewer">
    <!-- 使用浏览器原生的 iframe 来渲染 PDF，这是最轻量且不依赖庞大 pdf.js 库的方案 -->
    <iframe 
      v-if="src && !src.startsWith('mock_url')" 
      :src="src" 
      class="pdf-iframe" 
      title="PDF Viewer"
      @error="handleError"
    ></iframe>
    
    <div v-else class="empty-state">
      <el-result icon="info" title="等待加载" sub-title="请提供有效的 PDF 文件地址"></el-result>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['error'])

const handleError = (e) => {
  console.error('PDF iframe load error', e)
  emit('error', e)
}
</script>

<style scoped>
.custom-pdf-viewer {
  width: 100%;
  height: 100%;
  min-height: 800px;
  background-color: #525659; /* PDF 浏览器默认深色背景 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  min-height: 800px;
  border: none;
}

.empty-state {
  color: #fff;
}
</style>