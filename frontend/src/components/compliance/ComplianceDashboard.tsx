import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Download,
  FileText,
  BarChart3,
  DollarSign,
  Activity
} from 'lucide-react'
import axios from 'axios'

interface ComplianceOverview {
  kycStatus: {
    status: string
    level: string
    lastUpdated: string
    requiresUpdate: boolean
  }
  statistics: {
    totalOnrampTransactions: number
    totalSettlements: number
    flaggedTransactions: number
    pendingKycUsers: number
    recentOnrampVolume: number
    recentSettlementVolume: number
  }
  riskAssessment: {
    complianceScore: number
    riskLevel: string
    velocity: number
    avgTransactionSize: number
    recentActivityCount: number
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
    action: string
  }>
}

interface AMLData {
  transactionCount: number
  totalVolume: number
  patterns: {
    dailyVolumes: Record<string, number>
    currencyPatterns: Record<string, number>
    timePatterns: Record<string, number>
    amountPatterns: {
      small: number
      medium: number
      large: number
      veryLarge: number
    }
  }
  riskIndicators: Array<{
    type: string
    severity: string
    description: string
    value?: number
    threshold?: number
    percentage?: string
    count?: number
  }>
  monitoringPeriod: {
    start: string
    end: string
  }
}

export default function ComplianceDashboard() {
  const { } = useAuth()
  const [overview, setOverview] = useState<ComplianceOverview | null>(null)
  const [amlData, setAMLData] = useState<AMLData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'aml' | 'reports'>('overview')
  const [reportPeriod, setReportPeriod] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      const [overviewResponse, amlResponse] = await Promise.all([
        axios.get('/api/compliance/overview', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/compliance/aml-monitoring', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      setOverview(overviewResponse.data.overview)
      setAMLData(amlResponse.data.amlData)
    } catch (error) {
      console.error('Failed to fetch compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true)
      const response = await axios.get('/api/compliance/export', {
        params: {
          format,
          startDate: reportPeriod.startDate,
          endDate: reportPeriod.endDate
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: format === 'csv' ? 'blob' : 'json'
      })

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance-report-${reportPeriod.startDate}-to-${reportPeriod.endDate}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compliance-report-${reportPeriod.startDate}-to-${reportPeriod.endDate}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setExporting(false)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'MEDIUM':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'LOW':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Compliance Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor KYC/AML compliance and risk assessment
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportReport('csv')}
            disabled={exporting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportReport('json')}
            disabled={exporting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Shield },
            { id: 'aml', name: 'AML Monitoring', icon: Activity },
            { id: 'reports', name: 'Reports', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* KYC Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                KYC Status
              </h3>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                overview.kycStatus.status === 'VERIFIED' 
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-yellow-600 bg-yellow-50 border border-yellow-200'
              }`}>
                {overview.kycStatus.status === 'VERIFIED' ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                {overview.kycStatus.status}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
                <p className="font-medium text-gray-900 dark:text-white">{overview.kycStatus.level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {overview.kycStatus.lastUpdated 
                    ? new Date(overview.kycStatus.lastUpdated).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            {overview.kycStatus.requiresUpdate && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Your KYC information is over 1 year old and requires updating.
                </p>
              </div>
            )}
          </div>

          {/* Risk Assessment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Risk Assessment
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {overview.riskAssessment.complianceScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Compliance Score</div>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(overview.riskAssessment.riskLevel)}`}>
                  {overview.riskAssessment.riskLevel}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Risk Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.riskAssessment.velocity.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tx/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${overview.riskAssessment.avgTransactionSize.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Size</div>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    On-ramp Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {overview.statistics.totalOnrampTransactions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Settlements
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {overview.statistics.totalSettlements}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Flagged Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {overview.statistics.flaggedTransactions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {overview.alerts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Alerts
              </h3>
              <div className="space-y-3">
                {overview.alerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">{alert.message}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          alert.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AML Monitoring Tab */}
      {activeTab === 'aml' && amlData && (
        <div className="space-y-6">
          {/* AML Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {amlData.transactionCount}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Volume
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${amlData.totalVolume.toFixed(0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Risk Indicators
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {amlData.riskIndicators.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Patterns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Transaction Patterns
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Amount Distribution */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Amount Distribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Small (&lt; $1K)</span>
                    <span className="font-medium">{amlData.patterns.amountPatterns.small}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Medium ($1K - $5K)</span>
                    <span className="font-medium">{amlData.patterns.amountPatterns.medium}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Large ($5K - $10K)</span>
                    <span className="font-medium">{amlData.patterns.amountPatterns.large}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Very Large (&gt; $10K)</span>
                    <span className="font-medium">{amlData.patterns.amountPatterns.veryLarge}</span>
                  </div>
                </div>
              </div>

              {/* Currency Distribution */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Currency Distribution</h4>
                <div className="space-y-2">
                  {Object.entries(amlData.patterns.currencyPatterns).map(([currency, count]) => (
                    <div key={currency} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{currency}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Indicators */}
          {amlData.riskIndicators.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Risk Indicators
              </h3>
              <div className="space-y-3">
                {amlData.riskIndicators.map((indicator, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {getSeverityIcon(indicator.severity)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">{indicator.description}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          indicator.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          indicator.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {indicator.severity}
                        </span>
                      </div>
                      {indicator.value && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Value: ${indicator.value.toFixed(2)}
                          {indicator.threshold && ` (Threshold: $${indicator.threshold.toFixed(2)})`}
                        </p>
                      )}
                      {indicator.percentage && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Percentage: {indicator.percentage}%
                        </p>
                      )}
                      {indicator.count && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Count: {indicator.count}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Generate Compliance Report
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportPeriod.startDate}
                  onChange={(e) => setReportPeriod({...reportPeriod, startDate: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportPeriod.endDate}
                  onChange={(e) => setReportPeriod({...reportPeriod, endDate: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => exportReport('json')}
                disabled={exporting}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => exportReport('csv')}
                disabled={exporting}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Report Information
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">JSON Format</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comprehensive report including all transaction details, metadata, and compliance metrics in JSON format.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">CSV Format</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Simplified tabular format suitable for spreadsheet analysis and regulatory reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
