import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Clock, Upload, FileText, Camera, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'selfie'
  file: File | null
  uploaded: boolean
}

export default function KYCVerification() {
  const { user, updateUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [documents, setDocuments] = useState<KYCDocument[]>([
    { type: 'passport', file: null, uploaded: false },
    { type: 'drivers_license', file: null, uploaded: false },
    { type: 'national_id', file: null, uploaded: false },
    { type: 'selfie', file: null, uploaded: false }
  ])
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    nationality: ''
  })

  const handleFileUpload = (type: KYCDocument['type'], file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and PDF files are allowed')
      return
    }

    setDocuments(prev => prev.map(doc => 
      doc.type === type ? { ...doc, file, uploaded: false } : doc
    ))
    toast.success(`${type.replace('_', ' ')} document selected`)
  }

  const uploadDocument = async (type: KYCDocument['type']) => {
    const document = documents.find(doc => doc.type === type)
    if (!document?.file) {
      toast.error('Please select a file first')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('document', document.file)
      formData.append('type', type)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/kyc/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload document')
      }

      setDocuments(prev => prev.map(doc => 
        doc.type === type ? { ...doc, uploaded: true } : doc
      ))
      
      toast.success(`${type.replace('_', ' ')} uploaded successfully`)
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setIsLoading(false)
    }
  }

  const submitPersonalInfo = async () => {
    if (!personalInfo.fullName || !personalInfo.dateOfBirth || !personalInfo.address) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/kyc/personal-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        },
        body: JSON.stringify(personalInfo)
      })

      if (!response.ok) {
        throw new Error('Failed to submit personal information')
      }

      setCurrentStep(2)
      toast.success('Personal information submitted successfully')
    } catch (error) {
      console.error('Error submitting personal info:', error)
      toast.error('Failed to submit personal information')
    } finally {
      setIsLoading(false)
    }
  }

  const submitKYCApplication = async () => {
    const uploadedDocs = documents.filter(doc => doc.uploaded)
    if (uploadedDocs.length < 2) {
      toast.error('Please upload at least 2 documents (ID + Selfie)')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('SolanaPay-token')}`
        },
        body: JSON.stringify({
          documents: uploadedDocs.map(doc => ({ type: doc.type, uploaded: true }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit KYC application')
      }

      updateUser({ kycStatus: 'pending' })
      toast.success('KYC application submitted! We will review your documents within 24-48 hours.')
    } catch (error) {
      console.error('Error submitting KYC:', error)
      toast.error('Failed to submit KYC application')
    } finally {
      setIsLoading(false)
    }
  }

  const getDocumentIcon = (type: KYCDocument['type']) => {
    switch (type) {
      case 'selfie':
        return <Camera className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getDocumentLabel = (type: KYCDocument['type']) => {
    switch (type) {
      case 'passport':
        return 'Passport'
      case 'drivers_license':
        return "Driver's License"
      case 'national_id':
        return 'National ID'
      case 'selfie':
        return 'Selfie with ID'
      default:
        return type
    }
  }

  if (!user) return null

  const getStatusIcon = () => {
    switch (user.kycStatus) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-500" />
      case 'rejected':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <User className="h-6 w-6 text-blue-500" />
    }
  }

  if (user.kycStatus === 'approved') {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-6 w-6" />
            KYC Verified
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Your identity has been verified! You can now access all platform features.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (user.kycStatus === 'pending') {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Clock className="h-6 w-6" />
            KYC Under Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⏳ Your KYC application is being reviewed. This typically takes 24-48 hours. You'll be notified once approved.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          {getStatusIcon()}
          Complete KYC Verification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Verify your identity to access all platform features including task posting
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="text-sm font-medium">Personal Info</span>
          </div>
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="text-sm font-medium">Documents</span>
          </div>
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="text-sm font-medium">Review</span>
          </div>
        </div>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full legal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address *</label>
                <textarea
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full address"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={personalInfo.phoneNumber}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nationality</label>
                <input
                  type="text"
                  value={personalInfo.nationality}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, nationality: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., United States"
                />
              </div>
            </div>
            <Button 
              onClick={submitPersonalInfo}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Continue to Documents'}
            </Button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Upload Identity Documents</h3>
            <p className="text-sm text-muted-foreground">
              Please upload at least one government-issued ID and a selfie holding your ID
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.type} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getDocumentIcon(doc.type)}
                    <span className="font-medium">{getDocumentLabel(doc.type)}</span>
                    {doc.uploaded && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(doc.type, file)
                      }}
                      className="w-full text-sm"
                    />
                    
                    {doc.file && !doc.uploaded && (
                      <Button
                        size="sm"
                        onClick={() => uploadDocument(doc.type)}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {getDocumentLabel(doc.type)}
                      </Button>
                    )}
                    
                    {doc.uploaded && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={submitKYCApplication}
                disabled={isLoading || documents.filter(doc => doc.uploaded).length < 2}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
