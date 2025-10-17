<template>
  <div>
    <div style="margin-bottom: 20px;">
      <h2>代码审查</h2>
    </div>
    
    <el-card v-if="project">
      <el-row :gutter="20">
        <el-col :span="12">
          <div style="margin-bottom: 20px;">
            <el-form :model="reviewForm" :rules="rules" label-width="120px">
              <el-form-item label="项目名称">
                <el-input v-model="project.name" disabled></el-input>
              </el-form-item>
              
              <el-form-item label="开始时间" prop="startTime">
                <el-date-picker
                  v-model="reviewForm.startTime"
                  type="datetime"
                  placeholder="选择开始时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%;"
                />
              </el-form-item>
              
              <el-form-item label="结束时间" prop="endTime">
                <el-date-picker
                  v-model="reviewForm.endTime"
                  type="datetime"
                  placeholder="选择结束时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%;"
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="handleReview" :loading="loading">开始审查</el-button>
                <el-button @click="handleCancel">取消</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-col>
        
        <el-col :span="12">
          <div style="background-color: #f5f7fa; padding: 20px; border-radius: 4px;">
            <h3 style="margin-bottom: 15px;">审查配置</h3>
            <div style="margin-bottom: 10px;">
              <span class="label">项目类型：</span>
              <span>{{ project.projectType }}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span class="label">技术栈：</span>
              <span>{{ project.techStack.join(', ') || '无' }}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span class="label">审查文件后缀：</span>
              <span>{{ project.fileExtensions.join(', ') || '全部' }}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span class="label">忽略目录：</span>
              <span>{{ project.ignoreDirectories.join(', ') || '无' }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 审查进度和结果 -->
    <el-card v-if="reviewing">
      <h3 style="margin-bottom: 20px;">审查进度</h3>
      <el-progress :percentage="progress" :status="progressStatus" />
      <div style="margin-top: 20px;">
        <p>{{ progressText }}</p>
      </div>
    </el-card>
    
    <!-- 审查结果提示 -->
    <el-alert
      v-if="reviewResult"
      :title="reviewResult.status === 'success' ? '审查成功' : '审查失败'"
      :type="reviewResult.status === 'success' ? 'success' : 'error'"
      style="margin-top: 20px;"
      show-icon
    >
      <template #description>
        <div>
          <p v-if="reviewResult.status === 'success'">
            代码审查已完成，共审查 {{ reviewResult.totalFiles }} 个文件，
            通过 {{ reviewResult.passedFiles }} 个，失败 {{ reviewResult.failedFiles }} 个。
          </p>
          <p v-else>
            {{ reviewResult.message }}
          </p>
          <el-button 
            v-if="reviewResult.status === 'success' && reviewResult.resultId"
            type="primary" 
            size="small" 
            @click="viewReviewDetail"
            style="margin-top: 10px;"
          >
            查看审查详情
          </el-button>
        </div>
      </template>
    </el-alert>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import api from '../../api'

const router = useRouter()
const route = useRoute()
const projectId = route.params.id

const project = ref(null)
const reviewForm = reactive({
  startTime: '',
  endTime: ''
})
const loading = ref(false)
const reviewing = ref(false)
const progress = ref(0)
const progressText = ref('')
const progressStatus = ref('')
const reviewResult = ref(null)

const rules = {
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        if (value && reviewForm.startTime && dayjs(value).isBefore(dayjs(reviewForm.startTime))) {
          callback(new Error('结束时间不能早于开始时间'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 获取项目详情
const getProjectDetail = async () => {
  try {
    const response = await api.getProjectDetail(projectId)
    project.value = response.data
  } catch (error) {
    ElMessage.error('获取项目详情失败')
    console.error('Get project detail error:', error)
  }
}

// 开始审查
const handleReview = async () => {
  // 模拟表单验证
  let isValid = true
  if (!reviewForm.startTime) {
    isValid = false
    ElMessage.error('请选择开始时间')
  }
  if (!reviewForm.endTime) {
    isValid = false
    ElMessage.error('请选择结束时间')
  }
  if (reviewForm.startTime && reviewForm.endTime && 
      dayjs(reviewForm.endTime).isBefore(dayjs(reviewForm.startTime))) {
    isValid = false
    ElMessage.error('结束时间不能早于开始时间')
  }
  
  if (!isValid) return
  
  try {
    loading.value = true
    
    // 调用后端API开始审查
    const response = await api.startReview(projectId, {
      startTime: reviewForm.startTime,
      endTime: reviewForm.endTime
    })
    
    loading.value = false
    reviewing.value = true
    progress.value = 0
    progressText.value = '开始代码审查...'
    
    // 模拟审查进度
    simulateReviewProgress()
    
    // 这里应该使用WebSocket或轮询来获取真实的审查进度
    // 为了演示，我们模拟一个成功的结果
    setTimeout(() => {
      reviewResult.value = {
        status: 'success',
        totalFiles: 15,
        passedFiles: 12,
        failedFiles: 3,
        resultId: `${projectId}_${reviewForm.startTime}_${reviewForm.endTime}`
      }
      reviewing.value = false
    }, 5000)
  } catch (error) {
    loading.value = false
    ElMessage.error('代码审查失败')
    console.error('Start review error:', error)
  }
}

// 模拟审查进度
const simulateReviewProgress = () => {
  const interval = setInterval(() => {
    if (progress.value >= 100 || !reviewing.value) {
      clearInterval(interval)
      return
    }
    
    // 随机增加进度
    const increment = Math.floor(Math.random() * 10) + 1
    progress.value = Math.min(progress.value + increment, 95) // 留一点最后完成
    
    // 更新进度文本
    if (progress.value < 30) {
      progressText.value = '正在获取变更文件...'
    } else if (progress.value < 60) {
      progressText.value = '正在执行代码审查...'
    } else if (progress.value < 90) {
      progressText.value = '正在生成审查报告...'
    } else {
      progressText.value = '审查即将完成...'
    }
  }, 500)
}

// 查看审查详情
const viewReviewDetail = () => {
  router.push({
    name: 'ReviewDetail',
    params: {
      projectId: projectId,
      startTime: reviewForm.startTime,
      endTime: reviewForm.endTime
    }
  })
}

// 取消操作
const handleCancel = () => {
  router.push('/project-list')
}

onMounted(() => {
  getProjectDetail()
  
  // 设置默认时间范围（过去7天到现在）
  Object.assign(reviewForm, {
    startTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
  })
})
</script>

<style scoped>
.label {
  font-weight: bold;
  margin-right: 10px;
}
</style>