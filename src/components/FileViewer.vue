<template>
  <div class="file-viewer" :style="viewerTransformStyle">
    <!-- 如果是 mock 数据，展示占位图以示意 -->
    <div v-if="isMockUrl" class="mock-placeholder">
      <el-icon class="mock-icon" :size="64"><Document /></el-icon>
      <p>这是 {{ file.type.toUpperCase() }} 格式预览区</p>
      <p class="mock-desc">实际接入时，此处将渲染真实文件流: {{ file.name }}</p>
    </div>

    <!-- 真实渲染逻辑 -->
    <template v-else>
      <CustomDocxViewer 
        v-if="file.type === 'docx'" 
        :src="file.url" 
        @error="onError" 
        class="office-viewer"
      />
      
      <CustomExcelViewer 
        v-else-if="file.type === 'xlsx' || file.type === 'xls'" 
        :src="file.url" 
        @error="onError" 
        class="office-viewer"
      />
      
      <CustomPdfViewer 
        v-else-if="file.type === 'pdf'" 
        :src="file.url" 
        @error="onError" 
        class="office-viewer"
      />
      
      <!-- 图片预览 -->
      <div v-else-if="isImage" class="image-viewer">
        <img :src="file.url" :alt="file.name" />
      </div>

      <CustomVideoViewer 
        v-else-if="isVideo" 
        :src="file.url" 
        @error="onError" 
        class="office-viewer"
      />

      <div v-else class="unsupported">
        <el-result icon="warning" title="暂不支持在线预览" sub-title="该文件类型暂不支持直接在线查看">
          <template #extra>
            <el-button type="primary">下载原文件</el-button>
          </template>
        </el-result>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CustomExcelViewer from './CustomExcelViewer.vue'
import CustomDocxViewer from './CustomDocxViewer.vue'
import CustomPdfViewer from './CustomPdfViewer.vue'
import CustomVideoViewer from './CustomVideoViewer.vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  scale: {
    type: Number,
    default: 1
  },
  rotation: {
    type: Number,
    default: 0
  },
  flipX: {
    type: Number,
    default: 1
  },
  flipY: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['error'])

// 全局形变控制（应用于整个 FileViewer 容器，这样文档、PDF、视频也都能跟着放大缩小了）
const viewerTransformStyle = computed(() => ({
  transform: `scale(${props.scale}) rotate(${props.rotation}deg) scaleX(${props.flipX}) scaleY(${props.flipY})`,
  transformOrigin: 'center center',
  transition: 'transform 0.2s ease'
}))

const isImage = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(props.file.type.toLowerCase())
})

const isVideo = computed(() => {
  return ['mp4', 'webm', 'ogg'].includes(props.file.type.toLowerCase())
})

// 判断是否是占位 mock url，以便在没有真实文件时展示演示界面
const isMockUrl = computed(() => {
  return props.file.url && props.file.url.startsWith('mock_url')
})

const onError = (e) => {
  console.error('Preview error:', e)
  emit('error', e)
}
</script>

<style scoped>
.file-viewer {
  width: 100%;
  max-width: 1000px;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 800px;
  border-radius: 4px;
  overflow: hidden;
}

.office-viewer {
  width: 100%;
  height: 100%;
  min-height: 800px;
}

.image-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 800px;
  padding: 20px;
}

.image-viewer img {
  max-width: 100%;
  object-fit: contain;
}

.unsupported, .mock-placeholder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 800px;
  color: #909399;
}

.mock-icon {
  margin-bottom: 20px;
  color: #c0c4cc;
}

.mock-desc {
  font-size: 14px;
  margin-top: 10px;
  color: #a8abb2;
}
</style>