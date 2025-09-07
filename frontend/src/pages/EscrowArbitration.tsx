import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  EscrowArbitrationService, 
  EscrowData, 
  DisputeData, 
  ArbiterData,
  EscrowStatus,
  DisputeStatus,
  DisputeDecision 
} from '../services/escrowArbitrationService';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';

const EscrowArbitration: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [service, setService] = useState<EscrowArbitrationService | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Escrow states
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [arbiters, setArbiters] = useState<ArbiterData[]>([]);
  const [stats, setStats] = useState({
    totalEscrows: 0,
    totalDisputes: 0,
    totalVolume: 0,
    activeEscrows: 0,
  });

  // Form states
  const [createEscrowForm, setCreateEscrowForm] = useState({
    seller: '',
    amount: '',
    description: '',
    autoReleaseTime: '',
  });

  const [disputeForm, setDisputeForm] = useState({
    escrowId: '',
    reason: '',
  });

  const [arbiterForm, setArbiterForm] = useState({
    arbiterAccount: '',
    stakeAmount: '',
  });

  const [resolveDisputeForm, setResolveDisputeForm] = useState({
    disputeId: '',
    escrowId: '',
    arbiterId: '',
    decision: DisputeDecision.FavorBuyer,
    reasoning: '',
  });

  useEffect(() => {
    if (connected && publicKey) {
      initializeService();
    }
  }, [connected, publicKey]);

  const initializeService = async () => {
    try {
      // Load IDL (in production, this would be imported)
      const idl = await fetch('/idl/escrow_arbitration.json').then(r => r.json());
      const escrowService = await EscrowArbitrationService.initialize(
        connection,
        { publicKey, signTransaction: () => Promise.resolve() } as any,
        idl
      );
      setService(escrowService);
      await loadData(escrowService);
    } catch (error) {
      console.error('Failed to initialize service:', error);
      toast.error('Failed to initialize escrow service');
    }
  };

  const loadData = async (escrowService: EscrowArbitrationService) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const [userEscrows, activeDisputes, allArbiters, escrowStats] = await Promise.all([
        escrowService.getUserEscrows(publicKey),
        escrowService.getActiveDisputes(),
        escrowService.getAllArbiters(),
        escrowService.getEscrowStats(),
      ]);

      setEscrows(userEscrows);
      setDisputes(activeDisputes);
      setArbiters(allArbiters);
      setStats(escrowStats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load escrow data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEscrow = async () => {
    if (!service || !publicKey) return;

    try {
      setLoading(true);
      const seller = new PublicKey(createEscrowForm.seller);
      const amount = parseFloat(createEscrowForm.amount);
      const autoReleaseTime = createEscrowForm.autoReleaseTime 
        ? Math.floor(new Date(createEscrowForm.autoReleaseTime).getTime() / 1000)
        : undefined;

      const tx = await service.createEscrow(
        publicKey,
        seller,
        amount,
        createEscrowForm.description,
        autoReleaseTime
      );

      toast.success(`Escrow created! Transaction: ${tx}`);
      setCreateEscrowForm({ seller: '', amount: '', description: '', autoReleaseTime: '' });
      await loadData(service);
    } catch (error) {
      console.error('Error creating escrow:', error);
      toast.error('Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseEscrow = async (escrowId: PublicKey, seller: PublicKey) => {
    if (!service || !publicKey) return;

    try {
      setLoading(true);
      const tx = await service.releaseEscrow(escrowId, publicKey, seller);
      toast.success(`Escrow released! Transaction: ${tx}`);
      await loadData(service);
    } catch (error) {
      console.error('Error releasing escrow:', error);
      toast.error('Failed to release escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!service || !publicKey) return;

    try {
      setLoading(true);
      const escrowId = new PublicKey(disputeForm.escrowId);
      const tx = await service.createDispute(escrowId, publicKey, disputeForm.reason);
      
      toast.success(`Dispute created! Transaction: ${tx}`);
      setDisputeForm({ escrowId: '', reason: '' });
      await loadData(service);
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast.error('Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleAddArbiter = async () => {
    if (!service || !publicKey) return;

    try {
      setLoading(true);
      const arbiterAccount = new PublicKey(arbiterForm.arbiterAccount);
      const stakeAmount = parseFloat(arbiterForm.stakeAmount);

      const tx = await service.addArbiter(publicKey, arbiterAccount, stakeAmount);
      toast.success(`Arbiter added! Transaction: ${tx}`);
      setArbiterForm({ arbiterAccount: '', stakeAmount: '' });
      await loadData(service);
    } catch (error) {
      console.error('Error adding arbiter:', error);
      toast.error('Failed to add arbiter');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!service || !publicKey) return;

    try {
      setLoading(true);
      const disputeId = new PublicKey(resolveDisputeForm.disputeId);
      const escrowId = new PublicKey(resolveDisputeForm.escrowId);
      const arbiterId = new PublicKey(resolveDisputeForm.arbiterId);

      // Get escrow data to find buyer and seller
      const escrowData = await service.getEscrow(escrowId);
      if (!escrowData) {
        toast.error('Escrow not found');
        return;
      }

      const tx = await service.resolveDispute(
        disputeId,
        escrowId,
        arbiterId,
        escrowData.buyer,
        escrowData.seller,
        resolveDisputeForm.decision,
        resolveDisputeForm.reasoning
      );

      toast.success(`Dispute resolved! Transaction: ${tx}`);
      setResolveDisputeForm({
        disputeId: '',
        escrowId: '',
        arbiterId: '',
        decision: DisputeDecision.FavorBuyer,
        reasoning: '',
      });
      await loadData(service);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: EscrowStatus) => {
    const variants = {
      [EscrowStatus.Active]: 'default',
      [EscrowStatus.Completed]: 'success',
      [EscrowStatus.Refunded]: 'warning',
      [EscrowStatus.Cancelled]: 'destructive',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const getDisputeStatusBadge = (status: DisputeStatus) => {
    const variants = {
      [DisputeStatus.Open]: 'destructive',
      [DisputeStatus.Resolved]: 'success',
      [DisputeStatus.Appealed]: 'warning',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Please connect your wallet to access the Escrow & Arbitration system.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Escrow & Arbitration System</h1>
        <p className="text-gray-600">
          Secure payments with dispute resolution through decentralized arbitration
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalEscrows}</div>
            <div className="text-sm text-gray-600">Total Escrows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.activeEscrows}</div>
            <div className="text-sm text-gray-600">Active Escrows</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalDisputes}</div>
            <div className="text-sm text-gray-600">Total Disputes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} SOL</div>
            <div className="text-sm text-gray-600">Total Volume</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="escrows" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="escrows">My Escrows</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="arbiters">Arbiters</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
        </TabsList>

        <TabsContent value="escrows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Escrows</CardTitle>
            </CardHeader>
            <CardContent>
              {escrows.length === 0 ? (
                <p className="text-gray-600">No escrows found.</p>
              ) : (
                <div className="space-y-4">
                  {escrows.map((escrow, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">
                            {(escrow.amount.toNumber() / 1e9).toFixed(4)} SOL
                          </div>
                          <div className="text-sm text-gray-600">{escrow.description}</div>
                        </div>
                        {getStatusBadge(escrow.status)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Seller: {escrow.seller.toString().slice(0, 8)}...</div>
                        <div>Created: {new Date(escrow.createdAt.toNumber() * 1000).toLocaleDateString()}</div>
                        {escrow.isDisputed && (
                          <Badge variant="destructive" className="mt-2">Disputed</Badge>
                        )}
                      </div>
                      {escrow.status === EscrowStatus.Active && 
                       escrow.buyer.equals(publicKey!) && 
                       !escrow.isDisputed && (
                        <Button 
                          onClick={() => handleReleaseEscrow(new PublicKey(escrow.buyer.toString()), escrow.seller)}
                          className="mt-2"
                          size="sm"
                        >
                          Release Escrow
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <p className="text-gray-600">No active disputes.</p>
              ) : (
                <div className="space-y-4">
                  {disputes.map((dispute, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold">Dispute #{index + 1}</div>
                        {getDisputeStatusBadge(dispute.status)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Reason: {dispute.reason}</div>
                        <div>Disputer: {dispute.disputer.toString().slice(0, 8)}...</div>
                        <div>Created: {new Date(dispute.createdAt.toNumber() * 1000).toLocaleDateString()}</div>
                        {dispute.assignedArbiter && (
                          <div>Arbiter: {dispute.assignedArbiter.toString().slice(0, 8)}...</div>
                        )}
                        {dispute.decision && (
                          <div>Decision: {dispute.decision}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Dispute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Escrow ID"
                value={disputeForm.escrowId}
                onChange={(e) => setDisputeForm({ ...disputeForm, escrowId: e.target.value })}
              />
              <Textarea
                placeholder="Dispute reason (max 500 characters)"
                value={disputeForm.reason}
                onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                maxLength={500}
              />
              <Button onClick={handleCreateDispute} disabled={loading}>
                Create Dispute
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arbiters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Arbitration DAO Members</CardTitle>
            </CardHeader>
            <CardContent>
              {arbiters.length === 0 ? (
                <p className="text-gray-600">No arbiters registered.</p>
              ) : (
                <div className="space-y-4">
                  {arbiters.map((arbiter, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold">
                          {arbiter.pubkey.toString().slice(0, 8)}...
                        </div>
                        <Badge variant={arbiter.isActive ? "success" : "secondary"}>
                          {arbiter.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Stake: {(arbiter.stake.toNumber() / 1e9).toFixed(4)} SOL</div>
                        <div>Reputation: {arbiter.reputation}</div>
                        <div>Cases Resolved: {arbiter.casesResolved}</div>
                        <div>Joined: {new Date(arbiter.joinedAt.toNumber() * 1000).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolve Dispute (Arbiters Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Dispute ID"
                value={resolveDisputeForm.disputeId}
                onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, disputeId: e.target.value })}
              />
              <Input
                placeholder="Escrow ID"
                value={resolveDisputeForm.escrowId}
                onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, escrowId: e.target.value })}
              />
              <Input
                placeholder="Arbiter ID"
                value={resolveDisputeForm.arbiterId}
                onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, arbiterId: e.target.value })}
              />
              <select
                value={resolveDisputeForm.decision}
                onChange={(e) => setResolveDisputeForm({ 
                  ...resolveDisputeForm, 
                  decision: e.target.value as DisputeDecision 
                })}
                className="w-full p-2 border rounded"
              >
                <option value={DisputeDecision.FavorBuyer}>Favor Buyer</option>
                <option value={DisputeDecision.FavorSeller}>Favor Seller</option>
              </select>
              <Textarea
                placeholder="Reasoning for decision (max 1000 characters)"
                value={resolveDisputeForm.reasoning}
                onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, reasoning: e.target.value })}
                maxLength={1000}
              />
              <Button onClick={handleResolveDispute} disabled={loading}>
                Resolve Dispute
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Escrow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Seller Public Key"
                value={createEscrowForm.seller}
                onChange={(e) => setCreateEscrowForm({ ...createEscrowForm, seller: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Amount (SOL)"
                value={createEscrowForm.amount}
                onChange={(e) => setCreateEscrowForm({ ...createEscrowForm, amount: e.target.value })}
              />
              <Textarea
                placeholder="Description (max 200 characters)"
                value={createEscrowForm.description}
                onChange={(e) => setCreateEscrowForm({ ...createEscrowForm, description: e.target.value })}
                maxLength={200}
              />
              <Input
                type="datetime-local"
                placeholder="Auto-release time (optional)"
                value={createEscrowForm.autoReleaseTime}
                onChange={(e) => setCreateEscrowForm({ ...createEscrowForm, autoReleaseTime: e.target.value })}
              />
              <Button onClick={handleCreateEscrow} disabled={loading}>
                Create Escrow
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Arbiter to DAO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Arbiter Public Key"
                value={arbiterForm.arbiterAccount}
                onChange={(e) => setArbiterForm({ ...arbiterForm, arbiterAccount: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Stake Amount (SOL, minimum 0.01)"
                value={arbiterForm.stakeAmount}
                onChange={(e) => setArbiterForm({ ...arbiterForm, stakeAmount: e.target.value })}
              />
              <Button onClick={handleAddArbiter} disabled={loading}>
                Add Arbiter
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EscrowArbitration;
