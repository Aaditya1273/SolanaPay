import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useDID } from '../../contexts/DIDContext';
import { useAccount } from 'wagmi';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  FileText, 
  Camera,
  Star,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DIDAuthFlowProps {
  onComplete?: () => void;
  showKYC?: boolean;
  showReputation?: boolean;
}

export const DIDAuthFlow: React.FC<DIDAuthFlowProps> = ({
  onComplete,
  showKYC = true,
  showReputation = true
}) => {
  const { isConnected } = useAccount();
  const {
    did,
    isDidCreated,
    createDID,
    authenticateWithDID,
    kycCredential,
    reputationCredential,
    initiateKYC,
    submitKYCDocuments,
    getKYCStatus,
    updateReputation,
    getReputationScore,
    loading,
    error
  } = useDID();

  const [currentStep, setCurrentStep] = useState(0);
  const [kycStatus, setKycStatus] = useState<'not_started' | 'pending' | 'approved' | 'rejected'>('not_started');
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    dateOfBirth: '',
    nationality: '',
    documentType: 'passport'
  });
  const [kycDocuments, setKycDocuments] = useState<File[]>([]);
  const [authProgress, setAuthProgress] = useState(0);

  const steps = [
    { id: 'connect', title: 'Connect Wallet', description: 'Connect your Web3 wallet' },
    { id: 'create-did', title: 'Create DID', description: 'Generate your decentralized identity' },
    { id: 'authenticate', title: 'Authenticate', description: 'Verify your identity' },
    ...(showKYC ? [{ id: 'kyc', title: 'KYC Verification', description: 'Complete identity verification' }] : []),
    ...(showReputation ? [{ id: 'reputation', title: 'Reputation', description: 'Build your reputation score' }] : [])
  ];

  // Update current step based on state
  useEffect(() => {
    if (!isConnected) {
      setCurrentStep(0);
      setAuthProgress(0);
    } else if (!isDidCreated) {
      setCurrentStep(1);
      setAuthProgress(20);
    } else if (!did) {
      setCurrentStep(2);
      setAuthProgress(40);
    } else if (showKYC && !kycCredential) {
      setCurrentStep(3);
      setAuthProgress(60);
    } else if (showReputation && !reputationCredential) {
      setCurrentStep(showKYC ? 4 : 3);
      setAuthProgress(80);
    } else {
      setAuthProgress(100);
      onComplete?.();
    }
  }, [isConnected, isDidCreated, did, kycCredential, reputationCredential, showKYC, showReputation, onComplete]);

  // Check KYC status periodically
  useEffect(() => {
    if (did && showKYC) {
      const checkStatus = async () => {
        try {
          const status = await getKYCStatus();
          setKycStatus(status);
        } catch (err) {
          console.error('Failed to check KYC status:', err);
        }
      };

      checkStatus();
      const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [did, showKYC, getKYCStatus]);

  const handleCreateDID = async () => {
    try {
      await createDID();
      toast.success('DID created successfully!');
    } catch (err) {
      toast.error('Failed to create DID');
    }
  };

  const handleAuthenticate = async () => {
    try {
      const success = await authenticateWithDID();
      if (success) {
        toast.success('Authentication successful!');
      } else {
        toast.error('Authentication failed');
      }
    } catch (err) {
      toast.error('Authentication error');
    }
  };

  const handleKYCSubmit = async () => {
    try {
      // First initiate KYC with personal info
      await initiateKYC(personalInfo);
      
      // Then submit documents if any
      if (kycDocuments.length > 0) {
        await submitKYCDocuments(kycDocuments);
      }
      
      toast.success('KYC application submitted successfully!');
      setKycStatus('pending');
    } catch (err) {
      toast.error('Failed to submit KYC application');
    }
  };

  const handleUpdateReputation = async () => {
    try {
      await updateReputation();
      toast.success('Reputation updated successfully!');
    } catch (err) {
      toast.error('Failed to update reputation');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setKycDocuments(prev => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setKycDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step?.id) {
      case 'connect':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Connect Your Wallet
              </CardTitle>
              <CardDescription>
                Connect your Web3 wallet to begin the identity verification process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Please connect your wallet to continue</p>
                <p className="text-sm text-gray-500">
                  Your wallet will be used to create and manage your decentralized identity
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'create-did':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Create Decentralized Identity
              </CardTitle>
              <CardDescription>
                Generate your unique DID for secure authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What is a DID?</h4>
                <p className="text-sm text-blue-700">
                  A Decentralized Identity (DID) is a unique identifier that you own and control. 
                  It enables secure, privacy-preserving authentication without relying on centralized authorities.
                </p>
              </div>
              
              <Button 
                onClick={handleCreateDID} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating DID...
                  </>
                ) : (
                  'Create My DID'
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'authenticate':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Authenticate Identity
              </CardTitle>
              <CardDescription>
                Sign a message to prove ownership of your DID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {did && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Your DID</h4>
                  <p className="text-sm text-green-700 font-mono break-all">{did}</p>
                </div>
              )}
              
              <Button 
                onClick={handleAuthenticate} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Authenticate with DID'
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'kyc':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                KYC Verification
              </CardTitle>
              <CardDescription>
                Complete identity verification to unlock full platform features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {kycStatus === 'not_started' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <input
                        type="text"
                        value={personalInfo.name}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={personalInfo.dateOfBirth}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Nationality</label>
                      <input
                        type="text"
                        value={personalInfo.nationality}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, nationality: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your nationality"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Document Type</label>
                      <select
                        value={personalInfo.documentType}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, documentType: e.target.value }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="passport">Passport</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="national_id">National ID</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Documents</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Upload clear photos of your identity documents
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="kyc-upload"
                      />
                      <label
                        htmlFor="kyc-upload"
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700"
                      >
                        Choose Files
                      </label>
                    </div>
                    
                    {kycDocuments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {kycDocuments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={handleKYCSubmit} 
                    disabled={loading || !personalInfo.name || !personalInfo.dateOfBirth}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit KYC Application'
                    )}
                  </Button>
                </>
              )}

              {kycStatus === 'pending' && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Application Under Review</h3>
                  <p className="text-gray-600 mb-4">
                    Your KYC application is being reviewed. This usually takes 1-2 business days.
                  </p>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>
              )}

              {kycStatus === 'approved' && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">KYC Approved</h3>
                  <p className="text-gray-600 mb-4">
                    Your identity has been successfully verified!
                  </p>
                  <Badge variant="default" className="bg-green-500">Verified</Badge>
                </div>
              )}

              {kycStatus === 'rejected' && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">KYC Rejected</h3>
                  <p className="text-gray-600 mb-4">
                    Your application was rejected. Please contact support for assistance.
                  </p>
                  <Badge variant="destructive">Rejected</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'reputation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Build Reputation
              </CardTitle>
              <CardDescription>
                Establish your reputation score based on transaction history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Reputation Score</h4>
                <p className="text-sm text-purple-700 mb-3">
                  Your reputation score is calculated based on your transaction history, 
                  payment success rate, and community feedback.
                </p>
                {reputationCredential ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {getReputationScore()}
                    </div>
                    <Badge variant="default" className="bg-purple-500">
                      {reputationCredential.credentialSubject.trustLevel.toUpperCase()}
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    No reputation data available
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleUpdateReputation} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Reputation Score'
                )}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Identity Verification</h2>
        <p className="text-gray-600">
          Complete your decentralized identity setup to access all SolanaPay features
        </p>
        <div className="space-y-2">
          <Progress value={authProgress} className="w-full" />
          <p className="text-sm text-gray-500">{authProgress}% Complete</p>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${status === 'completed' ? 'bg-green-500 text-white' : 
                  status === 'current' ? 'bg-purple-600 text-white' : 
                  'bg-gray-200 text-gray-600'}
              `}>
                {status === 'completed' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-2
                  ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      {renderStepContent()}
    </div>
  );
};
