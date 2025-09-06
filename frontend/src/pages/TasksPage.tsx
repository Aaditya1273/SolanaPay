import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Search, Filter, Plus, Clock, MapPin, Star, Users, Loader2 } from 'lucide-react'
import { tasksAPI } from '@/services/api'
import toast from 'react-hot-toast'

interface Task {
  id: string
  title: string
  description: string
  category: string
  budget: number
  duration?: string
  location: string
  poster: {
    username: string
    rating: number
    avatar?: string
  }
  skills: string[]
  applications: number
  postedAt: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
}

const categories = ['All', 'Design', 'Writing', 'Marketing', 'Data Entry', 'Testing', 'Development', 'Translation']

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [selectedCategory, sortBy])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await tasksAPI.getTasks({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        page: 1,
        limit: 50
      })
      setTasks(response.data.tasks || [])
    } catch (err: any) {
      setError('Failed to load tasks. Please try again.')
      toast.error('Failed to load tasks')
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return task.title.toLowerCase().includes(query) ||
           task.description.toLowerCase().includes(query) ||
           task.skills.some(skill => skill.toLowerCase().includes(query))
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'budget-high':
        return b.budget - a.budget
      case 'budget-low':
        return a.budget - b.budget
      case 'applications':
        return a.applications - b.applications
      case 'newest':
      default:
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mini-Tasks</h1>
          <p className="text-muted-foreground">Find work that matches your skills</p>
        </div>
        <Button variant="SolanaPay" asChild>
          <Link to="/tasks/create">
            <Plus className="h-4 w-4 mr-2" />
            Post a Task
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks, skills, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchTasks()}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Categories */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "SolanaPay" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 border border-input rounded-md bg-background text-foreground text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="budget-high">Highest Budget</option>
                  <option value="budget-low">Lowest Budget</option>
                  <option value="applications">Fewest Applications</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-SolanaPay-purple-600" />
          <span className="ml-2 text-muted-foreground">Loading tasks...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="text-center py-12 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchTasks}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {!loading && !error && (
        <div className="space-y-4">
          {sortedTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link 
                      to={`/tasks/${task.id}`}
                      className="text-xl font-semibold hover:text-SolanaPay-purple-600 transition-colors"
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatRelativeTime(task.postedAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{task.location}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{task.applications} applications</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-SolanaPay-purple-600">
                      {formatCurrency(task.budget)}
                    </div>
                    <div className="text-sm text-muted-foreground">{task.duration}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground line-clamp-2">{task.description}</p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2">
                  {task.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-SolanaPay-purple-100 dark:bg-SolanaPay-purple-900/20 text-SolanaPay-purple-700 dark:text-SolanaPay-purple-300 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                      {task.poster.avatar ? (
                        <img src={task.poster.avatar} alt={task.poster.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">👤</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">@{task.poster.username}</p>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{task.poster.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/tasks/${task.id}`}>View Details</Link>
                    </Button>
                    <Button variant="SolanaPay" size="sm" asChild>
                      <Link to={`/tasks/${task.id}/apply`}>Apply Now</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedTasks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {tasks.length === 0 ? 'No tasks available' : 'No tasks found'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {tasks.length === 0 
                ? 'Be the first to post a task and start earning!'
                : 'Try adjusting your search criteria or browse different categories'
              }
            </p>
            {tasks.length === 0 ? (
              <Button variant="SolanaPay" asChild>
                <Link to="/tasks/create">Post the First Task</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
                fetchTasks()
              }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
