<template>
  <div class="preview-layout">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <div class="file-info" v-if="currentFile">
        <span class="file-name" v-if="!isCompareMode">{{ currentFile.name }}</span>
        <span class="file-name" v-else>
          正在控制: <el-tag type="warning" size="small">视图 {{ activeViewerId }}</el-tag>
        </span>
        <el-tag size="small" type="info" v-if="!isCompareMode">{{ currentFile.type }}</el-tag>
      </div>
      <div class="file-info" v-else>
        <span>未选择文件</span>
      </div>

      <div class="actions" v-if="currentFile">
        <!-- 联动操作开关 -->
        <div class="sync-control mr-4" v-if="isCompareMode">
          <el-switch v-model="syncMode" active-text="联动操作" inactive-text="独立操作" inline-prompt style="--el-switch-on-color: #13ce66;" />
        </div>

        <!-- 批量导航 -->
        <el-button-group class="mr-4">
          <el-button :icon="ArrowLeft" @click="prevFile" :disabled="!hasPrev" title="上一份" />
          <el-button :icon="ArrowRight" @click="nextFile" :disabled="!hasNext" title="下一份" />
        </el-button-group>

        <!-- 缩放与视图控制 -->
        <el-button-group class="mr-4">
          <el-button :icon="ZoomOut" @click="zoomOut" title="缩小" />
          <el-button @click="resetZoom" title="重置比例">{{ Math.round(currentViewer.scale * 100) }}%</el-button>
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
        <ul class="file-menu">
          <li 
            v-for="file in fileList" 
            :key="file.id" 
            class="file-menu-item"
            :class="{ 
              'is-active-a': viewers.A.file?.id === file.id,
              'is-active-b': viewers.B.file?.id === file.id 
            }"
            @click="handleSelect(file)"
          >
            <el-icon class="file-icon"><Document /></el-icon>
            <div class="menu-item-content">
              <span class="name" :title="file.name">{{ file.name }}</span>
              <el-tag v-if="file.status === 'error'" size="small" type="danger">失败</el-tag>
            </div>
            <!-- 对比按钮 -->
            <el-button 
              v-if="viewers.A.file?.id !== file.id && viewers.B.file?.id !== file.id" 
              size="small" 
              type="warning" 
              link 
              @click.stop="addToCompare(file)"
              title="加入对比"
              class="compare-btn"
            >
              VS
            </el-button>
          </li>
        </ul>
      </aside>

      <!-- 右侧预览区 -->
      <main class="preview-content" ref="previewContainerRef">
        <div class="split-pane" :class="{ 'is-compare': isCompareMode }">
          
          <!-- 视图 A -->
          <div class="viewer-pane" :class="{ 'active-pane': activeViewerId === 'A' }" @click="activeViewerId = 'A'">
            <div class="pane-header" v-if="isCompareMode">
              <el-tag type="warning" effect="dark" size="small">视图 A</el-tag>
              <span class="pane-title">{{ viewers.A.file?.name || '未选择' }}</span>
            </div>
            
            <div v-if="!viewers.A.file" class="empty-state">
              <el-empty description="请选择文件" />
            </div>
            <div v-else-if="viewers.A.file.status === 'error'" class="error-state">
              <el-result icon="error" title="预览失败" sub-title="文件可能已损坏"></el-result>
            </div>
            <div v-else class="viewer-wrapper">
              <FileViewer 
                :file="viewers.A.file" 
                :scale="viewers.A.scale"
                :rotation="viewers.A.rotation"
                :flipX="viewers.A.flipX"
                :flipY="viewers.A.flipY"
                @error="() => handlePreviewError('A')" 
              />
            </div>
          </div>

          <!-- 分割线 -->
          <div class="split-divider" v-if="isCompareMode"></div>

          <!-- 视图 B -->
          <div class="viewer-pane" v-if="isCompareMode" :class="{ 'active-pane': activeViewerId === 'B' }" @click="activeViewerId = 'B'">
            <div class="pane-header">
              <el-tag type="warning" effect="dark" size="small">视图 B</el-tag>
              <span class="pane-title">{{ viewers.B.file?.name || '未选择' }}</span>
              <el-button size="small" type="danger" link @click.stop="closeCompare">关闭对比</el-button>
            </div>
            
            <div v-if="!viewers.B.file" class="empty-state">
              <el-empty description="请从左侧加入对比" />
            </div>
            <div v-else-if="viewers.B.file.status === 'error'" class="error-state">
              <el-result icon="error" title="预览失败" sub-title="文件可能已损坏"></el-result>
            </div>
            <div v-else class="viewer-wrapper">
              <FileViewer 
                :file="viewers.B.file" 
                :scale="viewers.B.scale"
                :rotation="viewers.B.rotation"
                :flipX="viewers.B.flipX"
                :flipY="viewers.B.flipY"
                @error="() => handlePreviewError('B')" 
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

// 状态管理重构：支持双视图
const viewers = ref({
  A: { file: fileList.value[0], scale: 1, rotation: 0, flipX: 1, flipY: 1 },
  B: { file: null, scale: 1, rotation: 0, flipX: 1, flipY: 1 }
})

const activeViewerId = ref('A') // 当前正在被工具栏控制的视图
const isCompareMode = computed(() => !!viewers.value.B.file)
const syncMode = ref(false) // 是否联动操作

const currentViewer = computed(() => viewers.value[activeViewerId.value])
const currentFile = computed(() => currentViewer.value.file)

// 导航逻辑
const hasPrev = computed(() => {
  if (!currentFile.value) return false
  const idx = fileList.value.findIndex(f => f.id === currentFile.value.id)
  return idx > 0
})

const hasNext = computed(() => {
  if (!currentFile.value) return false
  const idx = fileList.value.findIndex(f => f.id === currentFile.value.id)
  return idx > -1 && idx < fileList.value.length - 1
})

// 通用形变控制辅助函数
const applyTransform = (action) => {
  const targets = syncMode.value && isCompareMode.value ? ['A', 'B'] : [activeViewerId.value]
  targets.forEach(vid => {
    action(viewers.value[vid])
  })
}

// 缩放控制
const zoomIn = () => applyTransform(v => { if (v.scale < 3) v.scale += 0.2 })
const zoomOut = () => applyTransform(v => { if (v.scale > 0.4) v.scale -= 0.2 })
const resetZoom = () => applyTransform(v => { v.scale = 1 })

// 旋转与翻转控制
const rotateLeft = () => applyTransform(v => { v.rotation -= 90 })
const rotateRight = () => applyTransform(v => { v.rotation += 90 })
const flipHorizontal = () => applyTransform(v => { v.flipX = v.flipX === 1 ? -1 : 1 })
const flipVertical = () => applyTransform(v => { v.flipY = v.flipY === 1 ? -1 : 1 })

const resetTransform = (vid) => {
  viewers.value[vid].scale = 1
  viewers.value[vid].rotation = 0
  viewers.value[vid].flipX = 1
  viewers.value[vid].flipY = 1
}



// 切换逻辑
const handleSelect = (file) => {
  viewers.value[activeViewerId.value].file = file
  resetTransform(activeViewerId.value)
}

const addToCompare = (file) => {
  viewers.value.B.file = file
  resetTransform('B')
  activeViewerId.value = 'B'
}

const closeCompare = () => {
  viewers.value.B.file = null
  activeViewerId.value = 'A'
  syncMode.value = false
}

const prevFile = () => {
  if (hasPrev.value) {
    const idx = fileList.value.findIndex(f => f.id === currentFile.value.id)
    handleSelect(fileList.value[idx - 1])
  }
}

const nextFile = () => {
  if (hasNext.value) {
    const idx = fileList.value.findIndex(f => f.id === currentFile.value.id)
    handleSelect(fileList.value[idx + 1])
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
  handleSelect(newFile)
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
  if (currentFile.value) {
    ElMessage.success(`开始下载: ${currentFile.value.name}`)
  }
}

const handlePreviewError = (vid) => {
  if (viewers.value[vid].file) {
    viewers.value[vid].file.status = 'error'
    ElMessage.error(`视图 ${vid} 文件预览失败`)
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
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  z-index: 10;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  max-width: 300px;
}

.file-name {
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-shadow: 1px 0 5px rgba(0,0,0,0.02);
  z-index: 5;
}

.sidebar-header {
  padding: 14px 20px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}

.file-menu {
  list-style: none;
  margin: 0;
  padding: 8px 0;
  flex: 1;
  overflow-y: auto;
}

.file-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 8px;
  border-radius: 6px;
}

.file-menu-item:hover {
  background-color: #f0f2f5;
}

.file-menu-item.is-active-a {
  background-color: #e6f1fc;
  color: #409eff;
}
.file-menu-item.is-active-a .file-icon,
.file-menu-item.is-active-a .name {
  color: #409eff;
  font-weight: 500;
}

.file-menu-item.is-active-b {
  background-color: #fdf6ec;
  color: #e6a23c;
}
.file-menu-item.is-active-b .file-icon,
.file-menu-item.is-active-b .name {
  color: #e6a23c;
  font-weight: 500;
}

.file-icon {
  margin-right: 10px;
  color: #909399;
}

.menu-item-content {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.menu-item-content .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}

.compare-btn {
  display: none;
}
.file-menu-item:hover .compare-btn {
  display: block;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: #ebedf0;
}

.split-pane {
  display: flex;
  width: 100%;
  height: 100%;
}

.viewer-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.active-pane {
  box-shadow: inset 0 0 0 2px #e6a23c;
}
.active-pane:first-child {
  box-shadow: inset 0 0 0 2px #409eff;
}

.pane-header {
  height: 44px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  font-size: 14px;
  z-index: 5;
}

.pane-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-weight: 500;
}

.split-divider {
  width: 6px;
  background-color: #f0f2f5;
  cursor: col-resize;
  z-index: 10;
  border-left: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
  transition: background-color 0.2s;
}
.split-divider:hover {
  background-color: #dcdfe6;
}

.empty-state, .error-state {
  margin-top: 100px;
}

.viewer-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 24px;
  overflow: auto;
}

/* 隐藏滚动条但保留功能 */
.viewer-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.viewer-wrapper::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 4px;
}
</style>
