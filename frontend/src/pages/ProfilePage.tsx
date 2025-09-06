import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAddress, formatCurrency } from '@/lib/utils'
import { User, Wallet, Shield, Bell, Palette, LogOut, Edit, Camera, Star, Award, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

interface UserProfile {
  id: string
  username: string
  email: string
  fullName: string
  bio: string
  avatar?: string
  joinedDate: string
  completedTasks: number
  rating: number
  totalEarned: number
  skills: string[]
  isVerified: boolean
  kycStatus: 'pending' | 'approved' | 'rejected'
  tier: string
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    skills: ''
  })
  const [notificationSettings, setNotificationSettings] = useState({
    taskUpdates: true,
    paymentNotifications: true,
    rewardNotifications: true,
    marketingEmails: false,
    weeklySummary: true
  })
  const [appPreferences, setAppPreferences] = useState({
    darkMode: false,
    language: 'English',
    currency: 'VRC',
    autoRefresh: true
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const { user, logout, updateUser } = useAuth()
  const { account, isConnected } = useWallet()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('SolanaPay-token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const profileData = response.data.user || response.data
      setProfile(profileData)
      setFormData({
        fullName: profileData.fullName || profileData.username || '',
        bio: profileData.bio || '',
        skills: Array.isArray(profileData.skills) ? profileData.skills.join(', ') : (profileData.skills || '')
      })
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.response?.data?.message || 'Failed to load profile')
      // Fallback to user data from auth context if available
      if (user) {
        const fallbackProfile: UserProfile = {
          id: user.id || 'unknown',
          username: user.username || 'user',
          email: user.email || '',
          fullName: user.fullName || user.username || 'User',
          bio: '',
          joinedDate: new Date().toISOString(),
          completedTasks: 0,
          rating: 0,
          totalEarned: 0,
          skills: [],
          isVerified: false,
          kycStatus: 'pending',
          tier: 'Bronze'
        }
        setProfile(fallbackProfile)
        setFormData({
          fullName: fallbackProfile.fullName,
          bio: fallbackProfile.bio,
          skills: ''
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null
    
    try {
      const formData = new FormData()
      formData.append('avatar', avatarFile)
      
      const token = localStorage.getItem('SolanaPay-token')
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users/avatar`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      
      return response.data.avatarUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload profile picture')
      return null
    }
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('SolanaPay-token')
      if (!token) {
        toast.error('Please log in to update your profile')
        return
      }

      // Upload avatar first if changed
      let avatarUrl = profile?.avatar
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      const updateData = {
        fullName: formData.fullName,
        bio: formData.bio,
        skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean),
        ...(avatarUrl && { avatar: avatarUrl })
      }

      const response = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users/profile`, updateData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      // Update local state with response data
      const updatedProfile = response.data.user || response.data
      if (updatedProfile) {
        setProfile(updatedProfile)
        // Sync with AuthContext
        updateUser({
          fullName: updatedProfile.fullName,
          avatar: updatedProfile.avatar,
          walletAddress: updatedProfile.walletAddress
        })
      } else if (profile) {
        const newProfile = {
          ...profile,
          ...updateData
        }
        setProfile(newProfile)
        // Sync with AuthContext (get walletAddress from WalletContext)
        updateUser({
          fullName: newProfile.fullName,
          avatar: newProfile.avatar,
          walletAddress: account || undefined // Use wallet address from WalletContext
        })
      }

      // Reset avatar state
      setAvatarFile(null)
      setAvatarPreview(null)
      
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to update profile'
      toast.error(errorMessage)
    }
  }

  const toggleNotificationSetting = async (key: keyof typeof notificationSettings) => {
    try {
      const newValue = !notificationSettings[key]
      setNotificationSettings(prev => ({ ...prev, [key]: newValue }))
      
      // Save to backend
      const token = localStorage.getItem('SolanaPay-token')
      if (token) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/notifications`, {
          [key]: newValue
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      toast.success(`${key} ${newValue ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error updating notification setting:', error)
      // Revert on error
      setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }))
      toast.error('Failed to update notification setting')
    }
  }

  const togglePreference = async (key: keyof typeof appPreferences) => {
    try {
      const newValue = !appPreferences[key]
      setAppPreferences(prev => ({ ...prev, [key]: newValue }))
      
      // Save to backend
      const token = localStorage.getItem('SolanaPay-token')
      if (token) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/preferences`, {
          [key]: newValue
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      toast.success(`${key} ${newValue ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error updating preference:', error)
      // Revert on error
      setAppPreferences(prev => ({ ...prev, [key]: !prev[key] }))
      toast.error('Failed to update preference')
    }
  }

  const updatePreference = async (key: keyof typeof appPreferences, value: string) => {
    try {
      setAppPreferences(prev => ({ ...prev, [key]: value }))
      
      // Save to backend
      const token = localStorage.getItem('SolanaPay-token')
      if (token) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/user/preferences`, {
          [key]: value
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      toast.success(`${key} updated to ${value}`)
    } catch (error) {
      console.error('Error updating preference:', error)
      toast.error('Failed to update preference')
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchProfile} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No profile data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile Preview" className="w-full h-full rounded-full object-cover" />
                ) : profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.username.charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-purple-500 hover:bg-purple-600 text-white rounded-full p-1.5 transition-colors cursor-pointer">
                <Camera className="h-3 w-3" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h2 className="text-2xl font-bold">{profile.fullName}</h2>
                {profile.isVerified && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mb-2">@{profile.username}</p>
              <p className="text-sm text-muted-foreground mb-4">{profile.bio || 'No bio available'}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.completedTasks}</div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold flex items-center justify-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{profile.rating > 0 ? profile.rating.toFixed(1) : 'N/A'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{formatCurrency(profile.totalEarned)}</div>
                  <div className="text-xs text-muted-foreground">Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.tier || 'Bronze'}</div>
                  <div className="text-xs text-muted-foreground">Tier</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'preferences', label: 'Preferences', icon: Palette }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                      placeholder="e.g. JavaScript, React, Node.js"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {avatarFile && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        📷 New profile picture selected: {avatarFile.name}
                      </p>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} className="flex-1" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false)
                      setAvatarFile(null)
                      setAvatarPreview(null)
                    }} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Username</label>
                      <p className="font-medium">@{profile.username}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="font-medium">{profile.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                      <p className="font-medium">{new Date(profile.joinedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <p className="font-medium">{profile.bio || 'No bio provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.skills && profile.skills.length > 0 ? (
                        profile.skills.map(skill => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm rounded-full"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No skills added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Verification Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Identity Verification</p>
                    <p className="text-sm text-muted-foreground">KYC verification completed</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-sm rounded-full ${
                  profile.kycStatus === 'approved' 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : profile.kycStatus === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  {profile.kycStatus === 'approved' ? 'Verified' : 
                   profile.kycStatus === 'pending' ? 'Pending' : 'Rejected'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Connection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected && account ? (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Connected Wallet</p>
                    <p className="text-sm text-muted-foreground font-mono">{formatAddress(account)}</p>
                    <p className="text-sm text-muted-foreground">Status: Connected</p>
                  </div>
                  <Button variant="outline" disabled>
                    Connected
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No wallet connected</p>
                  <Button variant="SolanaPay">Connect Wallet</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password & Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Password change feature coming soon!')}>Change</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success('2FA setup feature coming soon!')}>Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'taskUpdates', label: 'Task Updates', description: 'Get notified about task applications and completions' },
                { key: 'paymentNotifications', label: 'Payment Notifications', description: 'Receive alerts for incoming and outgoing payments' },
                { key: 'rewardNotifications', label: 'Reward Notifications', description: 'Get notified about new rewards and achievements' },
                { key: 'marketingEmails', label: 'Marketing Emails', description: 'Receive updates about new features and promotions' },
                { key: 'weeklySummary', label: 'Weekly Summary', description: 'Get a weekly summary of your activity' }
              ].map((setting) => {
                const isEnabled = notificationSettings[setting.key as keyof typeof notificationSettings]
                return (
                  <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{setting.label}</p>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <Button
                      variant={isEnabled ? "SolanaPay" : "outline"}
                      size="sm"
                      onClick={() => toggleNotificationSetting(setting.key as keyof typeof notificationSettings)}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'darkMode', label: 'Dark Mode', description: 'Toggle between light and dark themes', type: 'toggle' },
                { key: 'language', label: 'Language', description: 'Choose your preferred language', type: 'select' },
                { key: 'currency', label: 'Currency Display', description: 'Choose how to display currency values', type: 'select' },
                { key: 'autoRefresh', label: 'Auto-refresh', description: 'Automatically refresh data every 30 seconds', type: 'toggle' }
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{setting.label}</p>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  {setting.type === 'toggle' ? (
                    <Button 
                      variant={appPreferences[setting.key as keyof typeof appPreferences] ? "SolanaPay" : "outline"} 
                      size="sm"
                      onClick={() => togglePreference(setting.key as keyof typeof appPreferences)}
                    >
                      {appPreferences[setting.key as keyof typeof appPreferences] ? 'On' : 'Off'}
                    </Button>
                  ) : (
                    <select 
                      className="px-3 py-1 border border-input rounded-md bg-background text-foreground text-sm"
                      value={appPreferences[setting.key as keyof typeof appPreferences] as string}
                      onChange={(e) => updatePreference(setting.key as keyof typeof appPreferences, e.target.value)}
                    >
                      {setting.key === 'language' && (
                        <>
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                        </>
                      )}
                      {setting.key === 'currency' && (
                        <>
                          <option value="VRC">VRC</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="ETH">ETH</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg">
                  <div>
                    <p className="font-medium text-red-600">Sign Out</p>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        toast.error('Account deletion feature will be available soon.')
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
