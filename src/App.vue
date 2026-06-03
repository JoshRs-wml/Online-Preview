<template>
  <div class="preview-layout">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="file-info" v-if="currentFile">
        <span class="file-name">{{ currentFile.name }}</span>
        <el-tag size="small" type="info">{{ currentFile.type }}</el-tag>
        <span class="file-size">{{ currentFile.sizeStr }}</span>
      </div>
      <div class="file-info" v-else>
        <span>未选择文件</span>
      </div>

      <div class="actions" v-if="currentFile">
        <!-- 批量导航 -->
        <el-button-group class="mr-4">
          <el-button :icon="ArrowLeft" @click="prevFile" :disabled="!hasPrev" title="上一份" />
          <el-button :icon="ArrowRight" @click="nextFile" :disabled="!hasNext" title="下一份" />
        </el-button-group>

        <!-- 缩放与视图控制 -->
        <el-button-group class="mr-4">
          <el-button :icon="ZoomOut" @click="zoomOut" title="缩小" />
          <el-button @click="resetZoom" title="重置比例">{{ Math.round(scale * 100) }}%</el-button>
          <el-button :icon="ZoomIn" @click="zoomIn" title="放大" />
        </el-button-group>

        <!-- 旋转与翻转控制 -->
        <el-button-group class="mr-4">
          <el-button :icon="RefreshLeft" @click="rotateLeft" title="逆时针旋转" />
          <el-button :icon="RefreshRight" @click="rotateRight" title="顺时针旋转" />
          <el-button :icon="Switch" @click="flipHorizontal" title="水平翻转" />
          <el-button :icon="Sort" @click="flipVertical" title="垂直翻转" />
        </el-button-group>

        <el-button :icon="FullScreen" @click="toggleFullScreen" title="全屏" class="mr-4" />
        <el-button type="primary" :icon="Download" @click="downloadFile">下载</el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧批量文件列表 -->
      <aside class="batch-sidebar">
        <div class="sidebar-header">
          <span>文件队列 ({{ fileList.length }})</span>
          <el-upload
            class="upload-btn"
            action=""
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
          >
            <el-button size="small" type="primary" :icon="Plus">上传</el-button>
          </el-upload>
        </div>
        <el-menu
          :default-active="activeIndex"
          class="file-menu"
          @select="handleSelect"
        >
          <el-menu-item 
            v-for="(file, index) in fileList" 
            :key="file.id" 
            :index="index.toString()"
          >
            <el-icon><Document /></el-icon>
            <template #title>
              <div class="menu-item-content">
                <span class="name" :title="file.name">{{ file.name }}</span>
                <el-tag v-if="file.status === 'error'" size="small" type="danger">失败</el-tag>
              </div>
            </template>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 右侧预览区 -->
      <main class="preview-content" ref="previewContainerRef">
        <div v-if="!currentFile" class="empty-state">
          <el-empty description="请从左侧选择要预览的文件" />
        </div>
        
        <div v-else-if="currentFile.status === 'error'" class="error-state">
          <el-result icon="error" title="预览失败" sub-title="该文件可能已损坏或暂不支持在线预览">
            <template #extra>
              <el-button type="primary" @click="downloadFile">下载原文件查看</el-button>
            </template>
          </el-result>
        </div>

        <div v-else class="viewer-wrapper" :style="viewerStyle">
          <!-- 这里集成具体格式的预览组件 -->
          <FileViewer 
            :file="currentFile" 
            :scale="scale" 
            @error="handlePreviewError"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, shallowRef } from 'vue'
import { 
  ArrowLeft, ArrowRight, ZoomIn, ZoomOut, FullScreen, Download, 
  Document, Plus, RefreshLeft, RefreshRight, Switch, Sort 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import FileViewer from './components/FileViewer.vue'

// 模拟文件列表数据
const fileList = ref([
  { id: '1', name: '产品需求文档.docx', type: 'docx', sizeStr: '1.2 MB', url: '/sample.docx', status: 'success' },
  { id: '2', name: '2026年Q2财务报表.xlsx', type: 'xlsx', sizeStr: '542 KB', url: '/sample.xlsx', status: 'success' },
  { id: '3', name: '系统架构图.pdf', type: 'pdf', sizeStr: '3.4 MB', url: '/sample.pdf', status: 'success' },
  { id: '4', name: '现场取证照片.svg', type: 'svg', sizeStr: '2.1 MB', url: '/sample.svg', status: 'success' },
  { id: '5', name: '现场操作演示.mp4', type: 'mp4', sizeStr: '12.5 MB', url: 'https://www.w3schools.com/html/mov_bbb.mp4', status: 'success' },
  { id: '6', name: '未知格式文件.xyz', type: 'xyz', sizeStr: '10 KB', url: '', status: 'error' }
])

const activeIndex = ref('0')
const currentFile = computed(() => fileList.value[parseInt(activeIndex.value)])

const hasPrev = computed(() => parseInt(activeIndex.value) > 0)
const hasNext = computed(() => parseInt(activeIndex.value) < fileList.value.length - 1)

// 缩放控制
const scale = ref(1)
const zoomIn = () => { if (scale.value < 3) scale.value += 0.2 }
const zoomOut = () => { if (scale.value > 0.4) scale.value -= 0.2 }
const resetZoom = () => { scale.value = 1 }

// 旋转与翻转控制
const rotation = ref(0)
const flipX = ref(1)
const flipY = ref(1)

const rotateLeft = () => { rotation.value -= 90 }
const rotateRight = () => { rotation.value += 90 }
const flipHorizontal = () => { flipX.value = flipX.value === 1 ? -1 : 1 }
const flipVertical = () => { flipY.value = flipY.value === 1 ? -1 : 1 }

const resetTransform = () => {
  scale.value = 1
  rotation.value = 0
  flipX.value = 1
  flipY.value = 1
}

const viewerStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg) scaleX(${flipX.value}) scaleY(${flipY.value})`,
  transformOrigin: 'center center',
  transition: 'transform 0.2s ease'
}))

// 切换逻辑
const handleSelect = (index) => {
  activeIndex.value = index
  resetTransform()
}

const prevFile = () => {
  if (hasPrev.value) {
    activeIndex.value = (parseInt(activeIndex.value) - 1).toString()
    resetTransform()
  }
}

const nextFile = () => {
  if (hasNext.value) {
    activeIndex.value = (parseInt(activeIndex.value) + 1).toString()
    resetTransform()
  }
}

// 上传文件处理
const handleFileChange = (uploadFile) => {
  const rawFile = uploadFile.raw
  if (!rawFile) return

  const fileUrl = URL.createObjectURL(rawFile)
  const ext = rawFile.name.split('.').pop().toLowerCase()
  const sizeStr = (rawFile.size / 1024 / 1024).toFixed(2) + ' MB'

  const newFile = {
    id: Date.now().toString(),
    name: rawFile.name,
    type: ext,
    sizeStr: sizeStr,
    url: fileUrl,
    status: 'success'
  }

  fileList.value.push(newFile)
  activeIndex.value = (fileList.value.length - 1).toString()
  resetTransform()
  ElMessage.success(`文件 ${rawFile.name} 已加入预览队列`)
}

const previewContainerRef = ref(null)
const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    previewContainerRef.value?.requestFullscreen().catch(err => {
      ElMessage.error(`全屏请求失败: ${err.message}`)
    })
  } else {
    document.exitFullscreen()
  }
}

const downloadFile = () => {
  ElMessage.success(`开始下载: ${currentFile.value.name}`)
  // 实际项目中这里通过 a 标签或 API 触发下载
}

const handlePreviewError = () => {
  if (currentFile.value) {
    currentFile.value.status = 'error'
    ElMessage.error('文件预览失败')
  }
}
</script>

<style scoped>
.preview-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.toolbar {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.file-name {
  font-weight: 600;
  color: #303133;
}

.file-size {
  color: #909399;
}

.actions {
  display: flex;
  align-items: center;
}

.mr-4 {
  margin-right: 16px;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.batch-sidebar {
  width: 260px;
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px 20px;
  font-weight: 600;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  background-color: #fafafa;
}

.file-menu {
  flex: 1;
  overflow-y: auto;
  border-right: none;
}

.menu-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  overflow: hidden;
}

.menu-item-content .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.preview-content {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: #ebedf0;
  display: flex;
  justify-content: center;
}

.empty-state, .error-state {
  margin-top: 100px;
}

.viewer-wrapper {
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: center;
  padding: 24px;
}

/* 隐藏滚动条但保留功能 */
.preview-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.preview-content::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 4px;
}
</style>