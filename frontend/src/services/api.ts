import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vpay-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vpay-token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  register: (data: { email: string; password: string; username: string }) =>
    api.post('/auth/register', data),
  
  me: () => api.get('/auth/me'),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: () => api.post('/auth/refresh'),
}

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  
  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get('/wallet/transactions', { params }),
  
  sendPayment: (data: {
    to: string
    amount: string
    message?: string
  }) => api.post('/wallet/send', data),
  
  createPaymentRequest: (data: {
    amount: string
    description?: string
  }) => api.post('/wallet/request', data),
}

// Tasks API
export const tasksAPI = {
  getTasks: (params?: {
    page?: number
    limit?: number
    category?: string
    search?: string
  }) => api.get('/tasks', { params }),
  
  getTask: (id: string) => api.get(`/tasks/${id}`),
  
  createTask: (data: {
    title: string
    description: string
    category: string
    budget: number
    deadline: string
    skills: string[]
  }) => api.post('/tasks', data),
  
  applyToTask: (taskId: string, data: {
    proposal: string
    bidAmount: number
    estimatedTime: string
  }) => api.post(`/tasks/${taskId}/apply`, data),
  
  getMyTasks: () => api.get('/tasks/my'),
  
  updateTaskStatus: (taskId: string, status: string) =>
    api.patch(`/tasks/${taskId}/status`, { status }),
}

// Rewards API
export const rewardsAPI = {
  getRewards: () => api.get('/rewards'),
  getUser: (address: string) => api.get(`/rewards/user/${address}`),
  redeem: (rewardId: number | string, address: string) => api.post(`/rewards/${rewardId}/redeem`, { address }),
  getLeaderboard: () => api.get('/rewards/leaderboard'),
}

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  
  updateProfile: (data: {
    username?: string
    bio?: string
    skills?: string[]
  }) => api.patch('/user/profile', data),
  
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  updateKYC: (data: {
    documentType: string
    documentNumber: string
    documentImage: File
  }) => {
    const formData = new FormData()
    formData.append('documentType', data.documentType)
    formData.append('documentNumber', data.documentNumber)
    formData.append('documentImage', data.documentImage)
    return api.post('/user/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export default api
