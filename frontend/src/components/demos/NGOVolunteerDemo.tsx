import React, { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Heart, 
  Users, 
  CheckCircle, 
  Clock, 
  Award, 
  Upload, 
  MapPin, 
  Camera,
  Gift,
  Star
} from 'lucide-react'
import DisplayName from '@/components/common/DisplayName'
import { snsService } from '@/services/snsService'
import { soulboundNFTService } from '@/services/soulboundNFTService'
import toast from 'react-hot-toast'

interface Task {
  id: string
  title: string
  description: string
  rewardAmount: number
  rewardTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  maxCompletions: number
  currentCompletions: number
  deadline: Date
  proofType: 'Photo' | 'Document' | 'Video' | 'Location' | 'Attestation'
  status: 'Active' | 'Completed' | 'Expired'
  ngoName: string
}

interface TaskCompletion {
  id: string
  taskId: string
  volunteer: string
  proofData: string
  status: 'Pending' | 'Approved' | 'Rejected'
  submittedAt: Date
  feedback?: string
  nftMinted?: boolean
}

interface RewardNFT {
  id: string
  name: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  taskTitle: string
  ngoName: string
  mintedAt: Date
  image: string
}

const DEMO_TASKS: Task[] = [
  {
    id: '1',
    title: 'Beach Cleanup Drive',
    description: 'Help clean up plastic waste from our local beach. Take photos of before/after and collect at least 10 pieces of trash.',
    rewardAmount: 5,
    rewardTier: 'Silver',
    maxCompletions: 50,
    currentCompletions: 23,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    proofType: 'Photo',
    status: 'Active',
    ngoName: 'Ocean Guardians'
  },
  {
    id: '2',
    title: 'Food Bank Volunteer',
    description: 'Spend 2 hours helping sort and pack food donations at the community food bank.',
    rewardAmount: 10,
    rewardTier: 'Gold',
    maxCompletions: 20,
    currentCompletions: 8,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    proofType: 'Attestation',
    status: 'Active',
    ngoName: 'Community Kitchen'
  },
  {
    id: '3',
    title: 'Tree Planting Initiative',
    description: 'Plant native trees in designated areas. GPS location and photo proof required.',
    rewardAmount: 15,
    rewardTier: 'Platinum',
    maxCompletions: 100,
    currentCompletions: 67,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    proofType: 'Location',
    status: 'Active',
    ngoName: 'Green Earth Initiative'
  },
  {
    id: '4',
    title: 'Senior Care Visit',
    description: 'Spend time with elderly residents at local care homes. Bring joy through conversation and activities.',
    rewardAmount: 8,
    rewardTier: 'Gold',
    maxCompletions: 30,
    currentCompletions: 12,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    proofType: 'Document',
    status: 'Active',
    ngoName: 'Elder Care Network'
  }
]

export default function NGOVolunteerDemo() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'submissions' | 'rewards'>('tasks')
  const [tasks] = useState<Task[]>(DEMO_TASKS)
  const [submissions, setSubmissions] = useState<TaskCompletion[]>([])
  const [rewards, setRewards] = useState<RewardNFT[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [proofData, setProofData] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [volunteerStats, setVolunteerStats] = useState({
    tasksCompleted: 0,
    totalRewards: 0,
    nftsEarned: 0,
    impactScore: 0
  })
  const [volunteerDomain, setVolunteerDomain] = useState<string>('')
  const [ngoProfiles, setNgoProfiles] = useState<Map<string, string>>(new Map([
    ['Ocean Guardians', 'ocean.sol'],
    ['Community Kitchen', 'kitchen.sol'],
    ['Green Earth Initiative', 'green.sol'],
    ['Elder Care Network', 'eldercare.sol']
  ]))

  const submitTaskCompletion = async (task: Task) => {
    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (!proofData.trim()) {
      toast.error('Please provide proof of completion')
      return
    }

    setIsSubmitting(true)

    try {
      // Get or register volunteer domain
      let domain = await snsService.reverseLookup(publicKey)
      if (!domain) {
        // Auto-register a domain for demo
        const username = `volunteer${Math.floor(Math.random() * 1000)}`
        domain = `${username}.sol`
        await snsService.registerDomain(domain, publicKey)
        setVolunteerDomain(domain)
        toast.success(`Registered ${domain} for you!`)
      } else {
        setVolunteerDomain(domain)
      }

      // Simulate submission processing
      await new Promise(resolve => setTimeout(resolve, 1500))

      const newSubmission: TaskCompletion = {
        id: Date.now().toString(),
        taskId: task.id,
        volunteer: domain,
        proofData,
        status: 'Pending',
        submittedAt: new Date()
      }

      setSubmissions(prev => [newSubmission, ...prev])
      setProofData('')
      setSelectedTask(null)
      
      toast.success('Task submission received! Awaiting validation.')

      // Simulate automatic validation after 3 seconds
      setTimeout(async () => {
        setSubmissions(prev => 
          prev.map(sub => 
            sub.id === newSubmission.id 
              ? { 
                  ...sub, 
                  status: 'Approved',
                  feedback: 'Great work! Your contribution makes a real difference.'
                }
              : sub
          )
        )

        // Mint soulbound reward NFT
        try {
          const tier = task.rewardTier
          await soulboundNFTService.mintLoyaltyNFT(
            { publicKey, signTransaction: sendTransaction },
            domain,
            tier,
            {
              totalTransactions: volunteerStats.tasksCompleted + 1,
              totalVolume: volunteerStats.totalRewards + task.rewardAmount,
              merchantRating: 0,
              customerRating: 0,
              communityContributions: volunteerStats.tasksCompleted + 1,
              loyaltyStreak: 1,
              achievementCount: volunteerStats.nftsEarned + 1
            }
          )
        } catch (error) {
          console.error('NFT minting failed:', error)
        }

        // Create reward NFT record
        const newNFT: RewardNFT = {
          id: Date.now().toString(),
          name: `${task.title} Achievement`,
          tier: task.rewardTier,
          taskTitle: task.title,
          ngoName: task.ngoName,
          mintedAt: new Date(),
          image: getTierEmoji(task.rewardTier)
        }

        setRewards(prev => [newNFT, ...prev])
        
        setVolunteerStats(prev => ({
          tasksCompleted: prev.tasksCompleted + 1,
          totalRewards: prev.totalRewards + task.rewardAmount,
          nftsEarned: prev.nftsEarned + 1,
          impactScore: prev.impactScore + (task.rewardAmount * 10)
        }))

        toast.success(`Task approved! ${task.rewardTier} soulbound NFT minted to ${domain}!`)
      }, 3000)

    } catch (error) {
      console.error('Submission failed:', error)
      toast.error('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'Bronze': return '🥉'
      case 'Silver': return '🥈'
      case 'Gold': return '🥇'
      case 'Platinum': return '💎'
      default: return '🏆'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Bronze': return 'bg-amber-100 text-amber-800'
      case 'Silver': return 'bg-gray-100 text-gray-800'
      case 'Gold': return 'bg-yellow-100 text-yellow-800'
      case 'Platinum': return 'bg-purple-100 text-purple-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getProofIcon = (proofType: string) => {
    switch (proofType) {
      case 'Photo': return <Camera className="h-4 w-4" />
      case 'Location': return <MapPin className="h-4 w-4" />
      case 'Upload': return <Upload className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-red-500" />
          NGO Volunteer Hub
        </h1>
        <p className="text-muted-foreground">
          Complete community tasks and earn soulbound micro-reward NFTs for your impact
        </p>
        {volunteerDomain && (
          <div className="flex items-center justify-center">
            <DisplayName address={volunteerDomain} showAvatar showReputation />
          </div>
        )}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{volunteerStats.tasksCompleted}</p>
            <p className="text-sm text-muted-foreground">Tasks Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{volunteerStats.totalRewards}</p>
            <p className="text-sm text-muted-foreground">USDC Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{volunteerStats.nftsEarned}</p>
            <p className="text-sm text-muted-foreground">NFTs Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{volunteerStats.impactScore}</p>
            <p className="text-sm text-muted-foreground">Impact Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'tasks', label: 'Available Tasks', icon: Users },
          { id: 'submissions', label: 'My Submissions', icon: Clock },
          { id: 'rewards', label: 'NFT Collection', icon: Award }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Available Tasks */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.filter(task => task.status === 'Active').map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      <DisplayName 
                        address={ngoProfiles.get(task.ngoName) || task.ngoName} 
                        showAvatar 
                        fallbackToAddress={false}
                      />
                    </div>
                  </div>
                  <Badge className={getTierColor(task.rewardTier)}>
                    {getTierEmoji(task.rewardTier)} {task.rewardTier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{task.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    {getProofIcon(task.proofType)}
                    <span>{task.proofType} Required</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {task.rewardAmount} USDC
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{task.currentCompletions}/{task.maxCompletions}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(task.currentCompletions / task.maxCompletions) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    Deadline: {task.deadline.toLocaleDateString()}
                  </span>
                  <Button 
                    onClick={() => setSelectedTask(task)}
                    disabled={!publicKey}
                    size="sm"
                  >
                    Start Task
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No submissions yet</p>
                <p className="text-sm text-muted-foreground">Complete tasks to see your submissions here</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map(submission => {
              const task = tasks.find(t => t.id === submission.taskId)
              return (
                <Card key={submission.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{task?.title}</h3>
                        <div className="text-sm text-muted-foreground">
                          <DisplayName 
                            address={ngoProfiles.get(task?.ngoName || '') || task?.ngoName || ''} 
                            showAvatar 
                            fallbackToAddress={false}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted by: <DisplayName address={submission.volunteer} showAvatar />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {submission.submittedAt.toLocaleString()}
                        </p>
                        {submission.feedback && (
                          <p className="text-sm mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                            {submission.feedback}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            submission.status === 'Approved' ? 'default' :
                            submission.status === 'Pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {submission.status === 'Approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {submission.status === 'Pending' && <Clock className="h-3 w-3 mr-1" />}
                          {submission.status}
                        </Badge>
                        {submission.status === 'Approved' && (
                          <p className="text-sm text-green-600 mt-1">
                            +{task?.rewardAmount} USDC
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* NFT Collection */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rewards.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No NFTs earned yet</p>
                  <p className="text-sm text-muted-foreground">Complete and get approved for tasks to earn NFT rewards</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            rewards.map(nft => (
              <Card key={nft.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-6xl mb-3">{nft.image}</div>
                  <h3 className="font-semibold text-sm mb-1">{nft.name}</h3>
                  <Badge className={`${getTierColor(nft.tier)} mb-2`}>
                    {nft.tier}
                  </Badge>
                  <p className="text-xs text-muted-foreground mb-1">{nft.ngoName}</p>
                  <p className="text-xs text-muted-foreground">
                    {nft.mintedAt.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Task Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Submit Task Completion</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedTask.title}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Proof of Completion ({selectedTask.proofType})
                </label>
                <Textarea
                  value={proofData}
                  onChange={(e) => setProofData(e.target.value)}
                  placeholder={
                    selectedTask.proofType === 'Photo' ? 'Describe your photos and upload links...' :
                    selectedTask.proofType === 'Location' ? 'Provide GPS coordinates or location details...' :
                    selectedTask.proofType === 'Document' ? 'Upload document links or provide details...' :
                    'Provide proof of your volunteer work...'
                  }
                  rows={4}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitTaskCompletion(selectedTask)}
                  disabled={isSubmitting || !proofData.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
