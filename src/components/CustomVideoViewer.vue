<template>
  <div class="custom-video-viewer">
    <div v-if="!src || src.startsWith('mock_url')" class="empty-state">
      <el-result icon="info" title="视频预览" sub-title="请提供有效的视频文件地址"></el-result>
    </div>
    
    <div v-else class="video-container">
      <video 
        ref="videoRef"
        class="video-player"
        controls
        controlsList="nodownload"
        :src="src"
        @error="handleError"
        @loadedmetadata="handleLoaded"
      >
        您的浏览器不支持 HTML5 视频播放，请升级浏览器或下载原文件查看。
      </video>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['error'])
const videoRef = ref(null)

const handleError = (e) => {
  // 视频加载失败（可能是格式不支持或跨域等问题）
  console.error('Video load error', e)
  emit('error', new Error('视频加载失败，可能是格式不受浏览器支持'))
}

const handleLoaded = () => {
  // 视频元数据加载完成，可以做一些初始化逻辑
  console.log('Video metadata loaded')
}
</script>

<style scoped>
.custom-video-viewer {
  width: 100%;
  height: 100%;
  min-height: 500px;
  background-color: #000; /* 视频播放器经典黑色背景 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.video-player {
  max-width: 100%;
  max-height: 80vh; /* 防止视频过高撑爆屏幕 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  outline: none;
}

.empty-state {
  color: #fff;
}
</style>