const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/kyc');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// In-memory storage for demo (use database in production)
const didDocuments = new Map();
const credentials = new Map();
const kycApplications = new Map();
const reputationData = new Map();

// Store DID Document
router.post('/store', async (req, res) => {
  try {
    const { id, ...document } = req.body;
    
    if (!id || !document) {
      return res.status(400).json({ error: 'Invalid DID document' });
    }

    // Validate DID format
    if (!id.startsWith('did:ethr:0x')) {
      return res.status(400).json({ error: 'Invalid DID format' });
    }

    didDocuments.set(id, document);
    
    res.json({ success: true, message: 'DID document stored successfully' });
  } catch (error) {
    console.error('Error storing DID document:', error);
    res.status(500).json({ error: 'Failed to store DID document' });
  }
});

// Resolve DID Document
router.get('/resolve/:did', async (req, res) => {
  try {
    const { did } = req.params;
    const decodedDid = decodeURIComponent(did);
    
    const document = didDocuments.get(decodedDid);
    
    if (!document) {
      return res.status(404).json({ error: 'DID document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error resolving DID:', error);
    res.status(500).json({ error: 'Failed to resolve DID' });
  }
});

// Authenticate with DID
router.post('/authenticate', async (req, res) => {
  try {
    const { did, challenge, signature, address } = req.body;
    
    if (!did || !challenge || !signature || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the signature
    try {
      const recoveredAddress = ethers.utils.verifyMessage(challenge, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Check if DID matches address
      const expectedDid = `did:ethr:${address.toLowerCase()}`;
      if (did !== expectedDid) {
        return res.status(401).json({ error: 'DID does not match address' });
      }

      // Generate authentication token (in production, use proper JWT)
      const authToken = crypto.randomBytes(32).toString('hex');
      
      res.json({
        success: true,
        authToken,
        did,
        expiresIn: 3600 // 1 hour
      });
    } catch (verifyError) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('Error authenticating DID:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Verify Verifiable Credential
router.post('/verify-credential', async (req, res) => {
  try {
    const credential = req.body;
    
    if (!credential || !credential.proof || !credential.credentialSubject) {
      return res.status(400).json({ error: 'Invalid credential format' });
    }

    // Basic credential verification
    const { proof, ...credentialWithoutProof } = credential;
    
    // Verify credential structure
    const requiredFields = ['@context', 'id', 'type', 'issuer', 'issuanceDate', 'credentialSubject'];
    const hasAllFields = requiredFields.every(field => credential[field]);
    
    if (!hasAllFields) {
      return res.status(400).json({ error: 'Missing required credential fields' });
    }

    // Check expiration
    if (credential.expirationDate) {
      const expirationDate = new Date(credential.expirationDate);
      if (expirationDate < new Date()) {
        return res.status(400).json({ error: 'Credential has expired' });
      }
    }

    // In production, verify the cryptographic proof
    const isValid = true; // Simplified for demo
    
    res.json({
      valid: isValid,
      credential: credential,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying credential:', error);
    res.status(500).json({ error: 'Credential verification failed' });
  }
});

// Get credentials for a DID
router.get('/credentials/:did', async (req, res) => {
  try {
    const { did } = req.params;
    const decodedDid = decodeURIComponent(did);
    
    const userCredentials = credentials.get(decodedDid) || [];
    
    res.json(userCredentials);
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Store credential
router.post('/credentials', async (req, res) => {
  try {
    const credential = req.body;
    const did = credential.credentialSubject.id;
    
    if (!did) {
      return res.status(400).json({ error: 'Missing DID in credential subject' });
    }

    const userCredentials = credentials.get(did) || [];
    userCredentials.push(credential);
    credentials.set(did, userCredentials);
    
    res.json({ success: true, message: 'Credential stored successfully' });
  } catch (error) {
    console.error('Error storing credential:', error);
    res.status(500).json({ error: 'Failed to store credential' });
  }
});

// KYC Routes

// Initiate KYC process
router.post('/kyc/initiate', async (req, res) => {
  try {
    const { did, personalInfo } = req.body;
    
    if (!did || !personalInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const kycApplication = {
      id: crypto.randomUUID(),
      did,
      personalInfo,
      status: 'pending',
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    kycApplications.set(did, kycApplication);
    
    res.json({
      success: true,
      applicationId: kycApplication.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error initiating KYC:', error);
    res.status(500).json({ error: 'Failed to initiate KYC' });
  }
});

// Submit KYC documents
router.post('/kyc/documents', upload.array('documents', 5), async (req, res) => {
  try {
    const { did } = req.body;
    const files = req.files;
    
    if (!did || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing DID or documents' });
    }

    const kycApplication = kycApplications.get(did);
    if (!kycApplication) {
      return res.status(404).json({ error: 'KYC application not found' });
    }

    // Process uploaded files
    const documents = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString()
    }));

    kycApplication.documents = documents;
    kycApplication.status = 'under_review';
    kycApplication.updatedAt = new Date().toISOString();
    
    kycApplications.set(did, kycApplication);

    // Simulate automatic approval for demo (in production, this would be manual review)
    setTimeout(() => {
      const app = kycApplications.get(did);
      if (app) {
        app.status = 'approved';
        app.approvedAt = new Date().toISOString();
        kycApplications.set(did, app);

        // Create KYC credential
        const kycCredential = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://vpay.com/credentials/kyc/v1'
          ],
          id: `urn:uuid:${crypto.randomUUID()}`,
          type: ['VerifiableCredential', 'KYCCredential'],
          issuer: 'did:vpay:kyc-service',
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: did,
            name: app.personalInfo.name || 'Verified User',
            dateOfBirth: app.personalInfo.dateOfBirth,
            nationality: app.personalInfo.nationality,
            verificationLevel: 'basic',
            verifiedAt: new Date().toISOString(),
            documentType: 'government_id'
          },
          proof: {
            type: 'VPayKYCProof',
            created: new Date().toISOString(),
            verificationMethod: 'did:vpay:kyc-service#key-1',
            proofPurpose: 'assertionMethod',
            jws: crypto.randomBytes(32).toString('hex') // Mock signature
          }
        };

        // Store the credential
        const userCredentials = credentials.get(did) || [];
        userCredentials.push(kycCredential);
        credentials.set(did, userCredentials);
      }
    }, 5000); // Approve after 5 seconds for demo

    res.json({
      success: true,
      message: 'Documents submitted successfully',
      status: 'under_review'
    });
  } catch (error) {
    console.error('Error submitting KYC documents:', error);
    res.status(500).json({ error: 'Failed to submit documents' });
  }
});

// Get KYC status
router.get('/kyc/status/:did', async (req, res) => {
  try {
    const { did } = req.params;
    const decodedDid = decodeURIComponent(did);
    
    const kycApplication = kycApplications.get(decodedDid);
    
    if (!kycApplication) {
      return res.json({ status: 'not_started' });
    }

    res.json({
      status: kycApplication.status,
      applicationId: kycApplication.id,
      createdAt: kycApplication.createdAt,
      updatedAt: kycApplication.updatedAt,
      approvedAt: kycApplication.approvedAt
    });
  } catch (error) {
    console.error('Error getting KYC status:', error);
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

// Reputation Routes

// Update reputation score
router.post('/reputation/update', async (req, res) => {
  try {
    const { did } = req.body;
    
    if (!did) {
      return res.status(400).json({ error: 'Missing DID' });
    }

    // Mock reputation calculation (in production, this would analyze actual transaction data)
    const mockReputationData = {
      score: Math.floor(Math.random() * 100) + 700, // Score between 700-800
      totalTransactions: Math.floor(Math.random() * 100) + 50,
      successfulPayments: Math.floor(Math.random() * 95) + 45,
      averageRating: (Math.random() * 2 + 3).toFixed(1), // Rating between 3.0-5.0
      trustLevel: 'high',
      signature: crypto.randomBytes(32).toString('hex')
    };

    reputationData.set(did, mockReputationData);
    
    res.json(mockReputationData);
  } catch (error) {
    console.error('Error updating reputation:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
});

// Get reputation score
router.get('/reputation/:did', async (req, res) => {
  try {
    const { did } = req.params;
    const decodedDid = decodeURIComponent(did);
    
    const reputation = reputationData.get(decodedDid) || {
      score: 0,
      totalTransactions: 0,
      successfulPayments: 0,
      averageRating: 0,
      trustLevel: 'low'
    };
    
    res.json(reputation);
  } catch (error) {
    console.error('Error getting reputation:', error);
    res.status(500).json({ error: 'Failed to get reputation' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DID Service',
    timestamp: new Date().toISOString(),
    stats: {
      didDocuments: didDocuments.size,
      credentials: credentials.size,
      kycApplications: kycApplications.size,
      reputationProfiles: reputationData.size
    }
  });
});

module.exports = router;
