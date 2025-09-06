import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
// import { DIDProvider } from './contexts/DIDContext';
// import { SBTProvider } from './contexts/SBTContext'
import { RealTimeChatProvider } from './contexts/RealTimeChatContext'
import Layout from './components/layout/Layout'

// Simple loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
  </div>
)

// Pages
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import CreateTaskPage from './pages/tasks/CreateTaskPage'
import KYCPage from './pages/KYCPage'
import TasksPage from './pages/TasksPage'
import RewardsPage from './pages/RewardsPage'
import ProfilePage from './pages/ProfilePage'
import SendPaymentPage from './pages/payments/SendPaymentPage'
import ReceivePaymentPage from './pages/payments/ReceivePaymentPage'
import MerchantSettlementPage from './pages/payments/MerchantSettlementPage'
import OnboardingPage from './pages/auth/OnboardingPage'
import WalletPage from './pages/WalletPage'
import { LoyaltyDashboard } from './components/loyalty/LoyaltyDashboard'
// Gamification components temporarily disabled due to missing dependencies
// import GamifiedLoyaltyDashboard from './components/gamification/GamifiedLoyaltyDashboard'
// import QuestDashboard from './components/gamification/QuestDashboard'
// import StreakTracker from './components/gamification/StreakTracker'
// import LeaderboardDashboard from './components/gamification/LeaderboardDashboard'
// import NFTBadgeCollection from './components/gamification/NFTBadgeCollection'
import MerchantCustomerChat from './components/chat/MerchantCustomerChat'
import AIFAQChatbot from './components/chat/AIFAQChatbot'
import MessagesPage from './pages/MessagesPage'
import OnrampSettlementDashboard from './components/dashboard/OnrampSettlementDashboard'
import MerchantSettlementDashboard from './components/settlements/MerchantSettlementDashboard'
import ComplianceDashboard from './components/compliance/ComplianceDashboard'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

// Public Route Component (redirect to home if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />
}

function App() {
  return (
    <ChatProvider>
      {/* <DIDProvider> */}
        {/* <SBTProvider> */}
          <RealTimeChatProvider>
            <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      } />
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      } />

      {/* Protected Routes with Layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <HomePage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      } />
      
      <Route path="/wallet" element={
        <ProtectedRoute>
          <Layout>
            <WalletPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute>
          <Layout>
            <TasksPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/marketplace" element={
        <ProtectedRoute>
          <Layout>
            <TasksPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/rewards" element={
        <ProtectedRoute>
          <Layout>
            <RewardsPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout>
            <ProfilePage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/kyc" element={
        <ProtectedRoute>
          <Layout>
            <KYCPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/send" element={
        <ProtectedRoute>
          <Layout>
            <SendPaymentPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/receive" element={
        <ProtectedRoute>
          <Layout>
            <ReceivePaymentPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/settlements" element={
        <ProtectedRoute>
          <Layout>
            <MerchantSettlementPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks/create" element={
        <ProtectedRoute>
          <Layout>
            <CreateTaskPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks/:id" element={
        <ProtectedRoute>
          <Layout>
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Task Details</h2>
              <p className="text-muted-foreground">Task details page coming soon!</p>
            </div>
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tasks/:id/apply" element={
        <ProtectedRoute>
          <Layout>
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Apply to Task</h2>
              <p className="text-muted-foreground">Task application page coming soon!</p>
            </div>
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/loyalty" element={
        <ProtectedRoute>
          <Layout>
            <LoyaltyDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Gamification routes temporarily disabled due to missing dependencies
      <Route path="/gamification" element={
        <ProtectedRoute>
          <Layout>
            <GamifiedLoyaltyDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/quests" element={
        <ProtectedRoute>
          <Layout>
            <QuestDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/streaks" element={
        <ProtectedRoute>
          <Layout>
            <StreakTracker />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/leaderboards" element={
        <ProtectedRoute>
          <Layout>
            <LeaderboardDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/badges" element={
        <ProtectedRoute>
          <Layout>
            <NFTBadgeCollection />
          </Layout>
        </ProtectedRoute>
      } />
      */}
      
      <Route path="/messages" element={
        <ProtectedRoute>
          <Layout>
            <MessagesPage />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/support" element={
        <ProtectedRoute>
          <Layout>
            <MerchantCustomerChat />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/help" element={
        <ProtectedRoute>
          <Layout>
            <AIFAQChatbot />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/onramp-settlements" element={
        <ProtectedRoute>
          <Layout>
            <OnrampSettlementDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/merchant-settlements" element={
        <ProtectedRoute>
          <Layout>
            <MerchantSettlementDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/compliance" element={
        <ProtectedRoute>
          <Layout>
            <ComplianceDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </RealTimeChatProvider>
        {/* </SBTProvider> */}
      {/* </DIDProvider> */}
    </ChatProvider>
  )
}

export default App
