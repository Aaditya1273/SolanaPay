import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ethers } from 'ethers';

interface DIDDocument {
  id: string;
  '@context': string[];
  verificationMethod: VerificationMethod[];
  authentication: string[];
  service: ServiceEndpoint[];
  created: string;
  updated: string;
}

interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  ethereumAddress?: string;
}

interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

interface KYCCredential extends VerifiableCredential {
  credentialSubject: {
    id: string;
    name: string;
    dateOfBirth: string;
    nationality: string;
    verificationLevel: 'basic' | 'enhanced' | 'premium';
    verifiedAt: string;
    documentType: string;
  };
}

interface ReputationCredential extends VerifiableCredential {
  credentialSubject: {
    id: string;
    reputationScore: number;
    totalTransactions: number;
    successfulPayments: number;
    averageRating: number;
    trustLevel: 'low' | 'medium' | 'high' | 'verified';
    calculatedAt: string;
  };
}

interface DIDContextType {
  // DID Management
  did: string | null;
  didDocument: DIDDocument | null;
  isDidCreated: boolean;
  createDID: () => Promise<string>;
  resolveDID: (did: string) => Promise<DIDDocument | null>;
  
  // Credentials
  credentials: VerifiableCredential[];
  kycCredential: KYCCredential | null;
  reputationCredential: ReputationCredential | null;
  
  // Authentication
  authenticateWithDID: () => Promise<boolean>;
  signCredential: (credential: any) => Promise<VerifiableCredential>;
  verifyCredential: (credential: VerifiableCredential) => Promise<boolean>;
  
  // KYC Process
  initiateKYC: (personalInfo: any) => Promise<void>;
  submitKYCDocuments: (documents: File[]) => Promise<void>;
  getKYCStatus: () => Promise<'pending' | 'approved' | 'rejected'>;
  
  // Reputation
  updateReputation: () => Promise<void>;
  getReputationScore: () => number;
  
  // Utils
  loading: boolean;
  error: string | null;
}

const DIDContext = createContext<DIDContextType | undefined>(undefined);

interface DIDProviderProps {
  children: ReactNode;
}

export const DIDProvider: React.FC<DIDProviderProps> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [did, setDid] = useState<string | null>(null);
  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null);
  const [isDidCreated, setIsDidCreated] = useState(false);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [kycCredential, setKycCredential] = useState<KYCCredential | null>(null);
  const [reputationCredential, setReputationCredential] = useState<ReputationCredential | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create DID based on Ethereum address
  const createDID = async (): Promise<string> => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Create DID using did:ethr method
      const didIdentifier = `did:ethr:${address.toLowerCase()}`;
      
      // Create DID document
      const didDoc: DIDDocument = {
        id: didIdentifier,
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/secp256k1recovery-2020/v2'
        ],
        verificationMethod: [
          {
            id: `${didIdentifier}#controller`,
            type: 'EcdsaSecp256k1RecoveryMethod2020',
            controller: didIdentifier,
            ethereumAddress: address.toLowerCase()
          }
        ],
        authentication: [`${didIdentifier}#controller`],
        service: [
          {
            id: `${didIdentifier}#vpay-service`,
            type: 'VPayIdentityService',
            serviceEndpoint: 'https://api.vpay.com/did'
          }
        ],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      // Store DID document (in production, this would be stored on-chain or IPFS)
      await storeDIDDocument(didDoc);
      
      setDid(didIdentifier);
      setDidDocument(didDoc);
      setIsDidCreated(true);

      // Load existing credentials
      await loadCredentials(didIdentifier);

      return didIdentifier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create DID';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resolve DID document
  const resolveDID = async (didToResolve: string): Promise<DIDDocument | null> => {
    try {
      // In production, this would resolve from DID registry or IPFS
      const response = await fetch(`/api/did/resolve/${encodeURIComponent(didToResolve)}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (err) {
      console.error('Failed to resolve DID:', err);
      return null;
    }
  };

  // Store DID document
  const storeDIDDocument = async (document: DIDDocument): Promise<void> => {
    try {
      await fetch('/api/did/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document)
      });
    } catch (err) {
      console.error('Failed to store DID document:', err);
    }
  };

  // Authenticate with DID
  const authenticateWithDID = async (): Promise<boolean> => {
    if (!did || !address) {
      throw new Error('DID not created or wallet not connected');
    }

    try {
      const challenge = `VPay DID Authentication: ${Date.now()}`;
      const signature = await signMessageAsync({ message: challenge });
      
      // Verify signature and authenticate
      const response = await fetch('/api/did/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did,
          challenge,
          signature,
          address
        })
      });

      return response.ok;
    } catch (err) {
      console.error('DID authentication failed:', err);
      return false;
    }
  };

  // Sign verifiable credential
  const signCredential = async (credentialData: any): Promise<VerifiableCredential> => {
    if (!did || !address) {
      throw new Error('DID not created');
    }

    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://vpay.com/credentials/v1'
      ],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', credentialData.type],
      issuer: did,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: did,
        ...credentialData.subject
      },
      proof: {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        verificationMethod: `${did}#controller`,
        proofPurpose: 'assertionMethod',
        jws: '' // Will be filled with actual signature
      }
    };

    // Create signature
    const credentialHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(credential))
    );
    
    try {
      const signature = await signMessageAsync({ message: credentialHash });
      credential.proof.jws = signature;
      
      return credential;
    } catch (err) {
      throw new Error('Failed to sign credential');
    }
  };

  // Verify credential
  const verifyCredential = async (credential: VerifiableCredential): Promise<boolean> => {
    try {
      // Verify signature and credential integrity
      const response = await fetch('/api/did/verify-credential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credential)
      });

      return response.ok;
    } catch (err) {
      console.error('Credential verification failed:', err);
      return false;
    }
  };

  // Initiate KYC process
  const initiateKYC = async (personalInfo: any): Promise<void> => {
    if (!did) {
      throw new Error('DID required for KYC');
    }

    setLoading(true);
    try {
      await fetch('/api/kyc/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did,
          personalInfo
        })
      });
    } catch (err) {
      throw new Error('Failed to initiate KYC');
    } finally {
      setLoading(false);
    }
  };

  // Submit KYC documents
  const submitKYCDocuments = async (documents: File[]): Promise<void> => {
    if (!did) {
      throw new Error('DID required for KYC');
    }

    const formData = new FormData();
    formData.append('did', did);
    documents.forEach((doc, index) => {
      formData.append(`document_${index}`, doc);
    });

    setLoading(true);
    try {
      await fetch('/api/kyc/documents', {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      throw new Error('Failed to submit KYC documents');
    } finally {
      setLoading(false);
    }
  };

  // Get KYC status
  const getKYCStatus = async (): Promise<'pending' | 'approved' | 'rejected'> => {
    if (!did) {
      return 'pending';
    }

    try {
      const response = await fetch(`/api/kyc/status/${encodeURIComponent(did)}`);
      if (response.ok) {
        const data = await response.json();
        return data.status;
      }
      return 'pending';
    } catch (err) {
      return 'pending';
    }
  };

  // Update reputation score
  const updateReputation = async (): Promise<void> => {
    if (!did) return;

    try {
      const response = await fetch('/api/reputation/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ did })
      });

      if (response.ok) {
        const reputationData = await response.json();
        
        // Create reputation credential
        const reputationCred: ReputationCredential = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://vpay.com/credentials/reputation/v1'
          ],
          id: `urn:uuid:${crypto.randomUUID()}`,
          type: ['VerifiableCredential', 'ReputationCredential'],
          issuer: 'did:vpay:reputation-service',
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: did,
            reputationScore: reputationData.score,
            totalTransactions: reputationData.totalTransactions,
            successfulPayments: reputationData.successfulPayments,
            averageRating: reputationData.averageRating,
            trustLevel: reputationData.trustLevel,
            calculatedAt: new Date().toISOString()
          },
          proof: {
            type: 'VPayReputationProof',
            created: new Date().toISOString(),
            verificationMethod: 'did:vpay:reputation-service#key-1',
            proofPurpose: 'assertionMethod',
            jws: reputationData.signature
          }
        };

        setReputationCredential(reputationCred);
      }
    } catch (err) {
      console.error('Failed to update reputation:', err);
    }
  };

  // Get reputation score
  const getReputationScore = (): number => {
    return reputationCredential?.credentialSubject.reputationScore || 0;
  };

  // Load credentials for DID
  const loadCredentials = async (didToLoad: string): Promise<void> => {
    try {
      const response = await fetch(`/api/did/credentials/${encodeURIComponent(didToLoad)}`);
      if (response.ok) {
        const creds = await response.json();
        setCredentials(creds);
        
        // Set specific credential types
        const kycCred = creds.find((c: any) => c.type.includes('KYCCredential'));
        const repCred = creds.find((c: any) => c.type.includes('ReputationCredential'));
        
        if (kycCred) setKycCredential(kycCred);
        if (repCred) setReputationCredential(repCred);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
  };

  // Initialize DID when wallet connects
  useEffect(() => {
    if (isConnected && address && !did) {
      const existingDid = `did:ethr:${address.toLowerCase()}`;
      resolveDID(existingDid).then(doc => {
        if (doc) {
          setDid(existingDid);
          setDidDocument(doc);
          setIsDidCreated(true);
          loadCredentials(existingDid);
        }
      });
    }
  }, [isConnected, address]);

  // Clear DID when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setDid(null);
      setDidDocument(null);
      setIsDidCreated(false);
      setCredentials([]);
      setKycCredential(null);
      setReputationCredential(null);
    }
  }, [isConnected]);

  const value: DIDContextType = {
    // DID Management
    did,
    didDocument,
    isDidCreated,
    createDID,
    resolveDID,
    
    // Credentials
    credentials,
    kycCredential,
    reputationCredential,
    
    // Authentication
    authenticateWithDID,
    signCredential,
    verifyCredential,
    
    // KYC Process
    initiateKYC,
    submitKYCDocuments,
    getKYCStatus,
    
    // Reputation
    updateReputation,
    getReputationScore,
    
    // Utils
    loading,
    error
  };

  return (
    <DIDContext.Provider value={value}>
      {children}
    </DIDContext.Provider>
  );
};

export const useDID = (): DIDContextType => {
  const context = useContext(DIDContext);
  if (context === undefined) {
    throw new Error('useDID must be used within a DIDProvider');
  }
  return context;
};
