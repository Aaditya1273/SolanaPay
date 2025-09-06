import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Wallet, Zap, Shield, Users, Star, TrendingUp, Sparkles, LucideIcon, CheckCircle, Globe, Award, CreditCard, Smartphone, Lock, BarChart3, Play } from 'lucide-react'
import '../styles/animations.css'

const SolanaPayLanding = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({
    hero: false,
    stats: false,
    features: false,
    testimonials: false,
    cta: false
  })

  useEffect(() => {

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }))
        })
      },
      { threshold: 0.1 }
    )



    // Observe sections
    const sections = document.querySelectorAll('[id]')
    sections.forEach(section => observer.observe(section))

    return () => {
      observer.disconnect()
    }
  }, [])

  const features: Array<{
    icon: LucideIcon;
    title: string;
    desc: string;
  }> = [
    { icon: Zap, title: "Instant Transfers", desc: "Send money instantly to anyone, anywhere" },
    { icon: Shield, title: "Bank-Level Security", desc: "Your money is protected with advanced encryption" },
    { icon: Wallet, title: "Digital Wallet", desc: "Store, manage and spend your money digitally" },
    { icon: Users, title: "Easy Splitting", desc: "Split bills and expenses with friends effortlessly" }
  ]

  const stats = [
    { value: "$50B+", label: "Total Volume", icon: TrendingUp },
    { value: "2M+", label: "Global Users", icon: Users },
    { value: "0.01%", label: "Transaction Fee", icon: Wallet },
    { value: "99.99%", label: "Uptime", icon: Shield }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 overflow-hidden relative">
      {/* Enhanced Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-br from-[#5f259f] to-[#7c3aed] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-white font-bold text-xl">V</span>
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-[#5f259f] to-[#7c3aed] bg-clip-text text-transparent">SolanaPay</span>
              </div>
              
              {/* Navigation Links */}
              <div className="hidden lg:flex items-center space-x-8 ml-12">
                <a href="#features" className="text-gray-700 hover:text-[#5f259f] font-medium transition-colors">Features</a>
                <a href="#testimonials" className="text-gray-700 hover:text-[#5f259f] font-medium transition-colors">Reviews</a>
                <a href="#pricing" className="text-gray-700 hover:text-[#5f259f] font-medium transition-colors">Pricing</a>
                <a href="#contact" className="text-gray-700 hover:text-[#5f259f] font-medium transition-colors">Contact</a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-[#5f259f] px-6 py-2.5 rounded-xl transition-all duration-300 font-semibold"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] hover:from-[#4a1d7a] hover:to-[#6b21a8] text-white px-8 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative z-10 pt-32 pb-20 min-h-screen flex items-center">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className={`transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#5f259f]/10 to-[#7c3aed]/10 rounded-full px-6 py-3 mb-8 border border-purple-200/50">
                <Sparkles className="w-5 h-5 text-[#5f259f]" />
                <span className="text-[#5f259f] font-semibold">Trusted by 2M+ Users</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-[1.1]">
                <span className="block">The Future of</span>
                <span className="block bg-gradient-to-r from-[#5f259f] to-[#7c3aed] bg-clip-text text-transparent">
                  Digital Payments
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-lg">
                Send money instantly, split bills effortlessly, and manage your finances with bank-level security. Join the Web3 revolution.
              </p>
              
              {/* Trust Indicators */}
              <div className="flex items-center space-x-6 mb-10">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">Bank-level Security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">Instant Transfers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">0.01% Fees</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] hover:from-[#4a1d7a] hover:to-[#6b21a8] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center group"
                >
                  <span>Start Free Today</span>
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button 
                  onClick={() => window.open('https://gamma.app/docs/SolanaPay-Powering-the-Web3-Micro-Economy-a9zlnwnhhqgzp8s', '_blank')}
                  className="bg-white hover:bg-gray-50 text-gray-800 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center group"
                >
                  <Play className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>Watch Demo</span>
                </button>
              </div>
              
              {/* Social Proof */}
              <div className="flex items-center space-x-8 mt-12 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">$50B+</div>
                  <div className="text-sm text-gray-600">Volume Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">2M+</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">99.99%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
              </div>
            </div>
            
            {/* Right Visual */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible.hero ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="relative">
                {/* Main Phone Mockup */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-2 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-white rounded-[2.5rem] p-8 h-[600px] w-[300px]">
                    {/* Phone Content */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#5f259f] to-[#7c3aed] rounded-2xl mx-auto mb-6 flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">SolanaPay Wallet</h3>
                      <p className="text-gray-600 text-sm mb-8">Your digital finance hub</p>
                      
                      {/* Balance Card */}
                      <div className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] rounded-2xl p-6 text-white mb-6">
                        <div className="text-left">
                          <div className="text-sm opacity-80 mb-1">Total Balance</div>
                          <div className="text-3xl font-bold">$12,450.00</div>
                          <div className="text-sm opacity-80 mt-2">+$1,200 this month</div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <CreditCard className="w-6 h-6 text-[#5f259f] mb-2" />
                          <div className="text-sm font-semibold">Send Money</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <Smartphone className="w-6 h-6 text-[#5f259f] mb-2" />
                          <div className="text-sm font-semibold">Pay Bills</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-8 -left-8 bg-white rounded-2xl p-4 shadow-lg animate-bounce">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-900">Payment Sent</span>
                  </div>
                </div>
                
                <div className="absolute -bottom-8 -right-8 bg-white rounded-2xl p-4 shadow-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-[#5f259f]" />
                    <span className="text-sm font-semibold text-gray-900">Secured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section id="stats" className="relative z-10 py-24 bg-gradient-to-r from-[#5f259f] to-[#7c3aed]">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible.stats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Millions Worldwide
            </h2>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Join the fastest-growing digital payment platform
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "$50B+", label: "Volume Processed", icon: TrendingUp, desc: "Total transaction volume" },
              { value: "2M+", label: "Active Users", icon: Users, desc: "Trusted by millions" },
              { value: "0.01%", label: "Transaction Fee", icon: Wallet, desc: "Industry-lowest fees" },
              { value: "99.99%", label: "Uptime", icon: Shield, desc: "Always available" }
            ].map((stat, index) => (
              <div key={index} className={`text-center group transition-all duration-1000 delay-${index * 100} ${isVisible.stats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                  <stat.icon className="w-12 h-12 text-white mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-purple-100 font-semibold mb-2">{stat.label}</div>
                  <div className="text-sm text-purple-200 opacity-80">{stat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="relative z-10 py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-20 transition-all duration-1000 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#5f259f]/10 to-[#7c3aed]/10 rounded-full px-6 py-3 mb-8">
              <Award className="w-5 h-5 text-[#5f259f]" />
              <span className="text-[#5f259f] font-semibold">Award-Winning Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need for
              <span className="block bg-gradient-to-r from-[#5f259f] to-[#7c3aed] bg-clip-text text-transparent">
                Modern Payments
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Powerful features designed to simplify your financial life and accelerate your business growth
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: Zap, 
                title: "Lightning Fast Transfers", 
                desc: "Send money anywhere in the world in under 3 seconds with our advanced blockchain technology",
                color: "from-yellow-400 to-orange-500"
              },
              { 
                icon: Shield, 
                title: "Military-Grade Security", 
                desc: "Your funds are protected by bank-level encryption and multi-signature authentication",
                color: "from-green-400 to-emerald-500"
              },
              { 
                icon: Wallet, 
                title: "Smart Digital Wallet", 
                desc: "Manage multiple currencies, track expenses, and automate savings with AI-powered insights",
                color: "from-blue-400 to-indigo-500"
              },
              { 
                icon: Users, 
                title: "Effortless Bill Splitting", 
                desc: "Split expenses with friends instantly using QR codes, contacts, or social media integration",
                color: "from-purple-400 to-pink-500"
              },
              { 
                icon: Globe, 
                title: "Global Reach", 
                desc: "Send and receive payments in 150+ countries with real-time currency conversion",
                color: "from-cyan-400 to-teal-500"
              },
              { 
                icon: BarChart3, 
                title: "Advanced Analytics", 
                desc: "Track spending patterns, set budgets, and get personalized financial recommendations",
                color: "from-red-400 to-rose-500"
              }
            ].map((feature, index) => (
              <div key={index} className={`group cursor-pointer transition-all duration-1000 delay-${index * 100} ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200 group-hover:-translate-y-2">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-[#5f259f] transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                  
                  {/* Hover Arrow */}
                  <div className="flex items-center mt-6 text-[#5f259f] opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-sm font-semibold mr-2">Learn more</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Feature Highlight */}
          <div className="mt-20">
            <div className="bg-gradient-to-r from-[#5f259f]/5 to-[#7c3aed]/5 rounded-3xl p-12 border border-purple-100">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">
                    Ready to experience the future of payments?
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    Join millions of users who have already made the switch to SolanaPay. 
                    Start with a free account and see the difference.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => navigate('/register')}
                      className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] hover:from-[#4a1d7a] hover:to-[#6b21a8] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center group"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="bg-white hover:bg-gray-50 text-gray-800 px-8 py-3 rounded-xl font-semibold transition-all duration-300 border-2 border-gray-200 hover:border-gray-300">
                      Contact Sales
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-white rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#5f259f] to-[#7c3aed] rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Setup Complete</div>
                        <div className="text-sm text-gray-600">Account verified in 2 minutes</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Identity Verification</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Bank Account Linked</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Security Enabled</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible.testimonials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Trusted by <span className="text-[#5f259f]">Millions</span>
            </h2>
            <p className="text-xl text-gray-600">See what our users are saying</p>
          </div>
          
          {/* First Row - Left to Right */}
          <div className="relative mb-8">
            <div className="flex animate-scroll-left space-x-6">
              {[
                { name: "Priya Sharma", role: "Small Business Owner", content: "SolanaPay made accepting payments so easy. My customers love the quick checkout!", avatar: "P" },
                { name: "Rahul Kumar", role: "Freelancer", content: "Getting paid internationally was never this simple. SolanaPay is a game-changer.", avatar: "R" },
                { name: "Anita Patel", role: "Student", content: "Splitting expenses with friends is now effortless. Love the user-friendly interface!", avatar: "A" },
                { name: "Vikash Singh", role: "E-commerce Owner", content: "The payment gateway integration was seamless. Our conversion rates improved by 40%!", avatar: "V" },
                { name: "Meera Joshi", role: "Consultant", content: "International clients can now pay me instantly. SolanaPay removed all payment barriers.", avatar: "M" },
                { name: "Arjun Reddy", role: "Startup Founder", content: "SolanaPay's escrow system gave our customers confidence. Trust increased significantly.", avatar: "A" },
                // Duplicate for seamless loop
                { name: "Priya Sharma", role: "Small Business Owner", content: "SolanaPay made accepting payments so easy. My customers love the quick checkout!", avatar: "P" },
                { name: "Rahul Kumar", role: "Freelancer", content: "Getting paid internationally was never this simple. SolanaPay is a game-changer.", avatar: "R" },
                { name: "Anita Patel", role: "Student", content: "Splitting expenses with friends is now effortless. Love the user-friendly interface!", avatar: "A" },
              ].map((testimonial, index) => (
                <div key={index} className="flex-shrink-0 w-80 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 testimonial-card">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-[#5f259f] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="text-gray-900 font-semibold">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">"{testimonial.content}"</p>
                  <div className="flex text-yellow-500 star-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Second Row - Right to Left */}
          <div className="relative mb-8">
            <div className="flex animate-scroll-right space-x-6">
              {[
                { name: "Deepak Gupta", role: "Restaurant Owner", content: "QR code payments made our service faster. Customers love the convenience!", avatar: "D" },
                { name: "Sneha Kapoor", role: "Fashion Designer", content: "Receiving payments from global clients is now instant. Amazing experience!", avatar: "S" },
                { name: "Ravi Mehta", role: "Tech Lead", content: "The API documentation is excellent. Integration took just 2 hours!", avatar: "R" },
                { name: "Kavya Nair", role: "Photographer", content: "Event payments are so smooth now. Clients pay instantly after shoots.", avatar: "K" },
                { name: "Amit Sharma", role: "Delivery Partner", content: "Daily earnings tracking helps me plan better. SolanaPay is incredibly reliable.", avatar: "A" },
                { name: "Pooja Agarwal", role: "Online Tutor", content: "Students from different countries can pay easily. No more payment delays!", avatar: "P" },
                // Duplicate for seamless loop
                { name: "Deepak Gupta", role: "Restaurant Owner", content: "QR code payments made our service faster. Customers love the convenience!", avatar: "D" },
                { name: "Sneha Kapoor", role: "Fashion Designer", content: "Receiving payments from global clients is now instant. Amazing experience!", avatar: "S" },
                { name: "Ravi Mehta", role: "Tech Lead", content: "The API documentation is excellent. Integration took just 2 hours!", avatar: "R" },
              ].map((testimonial, index) => (
                <div key={index} className="flex-shrink-0 w-80 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 testimonial-card">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-[#5f259f] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="text-gray-900 font-semibold">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">"{testimonial.content}"</p>
                  <div className="flex text-yellow-500 star-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Third Row - Left to Right */}
          <div className="relative">
            <div className="flex animate-scroll-left-slow space-x-6">
              {[
                { name: "Manish Jain", role: "Grocery Store Owner", content: "Digital payments increased our daily sales by 60%. SolanaPay is a blessing!", avatar: "M" },
                { name: "Nisha Verma", role: "Yoga Instructor", content: "Students book and pay for classes seamlessly. No more cash handling!", avatar: "N" },
                { name: "Suresh Patel", role: "Taxi Driver", content: "Passengers prefer SolanaPay over cash. My earnings are tracked automatically.", avatar: "S" },
                { name: "Ritika Sood", role: "Event Planner", content: "Vendor payments are instant now. Events run smoother than ever!", avatar: "R" },
                { name: "Karan Malhotra", role: "Gym Owner", content: "Membership renewals are automated. Members love the convenience!", avatar: "K" },
                { name: "Divya Iyer", role: "Boutique Owner", content: "Online and offline payments unified in one platform. Simply amazing!", avatar: "D" },
                // Duplicate for seamless loop
                { name: "Manish Jain", role: "Grocery Store Owner", content: "Digital payments increased our daily sales by 60%. SolanaPay is a blessing!", avatar: "M" },
                { name: "Nisha Verma", role: "Yoga Instructor", content: "Students book and pay for classes seamlessly. No more cash handling!", avatar: "N" },
                { name: "Suresh Patel", role: "Taxi Driver", content: "Passengers prefer SolanaPay over cash. My earnings are tracked automatically.", avatar: "S" },
              ].map((testimonial, index) => (
                <div key={index} className="flex-shrink-0 w-80 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 testimonial-card">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-[#5f259f] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{testimonial.avatar}</span>
                    </div>
                    <div>
                      <div className="text-gray-900 font-semibold">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">"{testimonial.content}"</p>
                  <div className="flex text-yellow-500 star-rating">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section id="cta" className="relative z-10 py-24 bg-gradient-to-br from-gray-900 via-[#5f259f] to-[#7c3aed] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 border border-white rounded-full"></div>
            <div className="absolute top-40 right-32 w-24 h-24 border border-white rounded-full"></div>
            <div className="absolute bottom-32 left-1/3 w-40 h-40 border border-white rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-28 h-28 border border-white rounded-full"></div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className={`text-center transition-all duration-1000 ${isVisible.cta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Join the Revolution</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Transform Your
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Financial Future?
              </span>
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join over 2 million users who have already discovered the power of instant, secure digital payments. 
              Start your journey today - it takes less than 2 minutes.
            </p>
            
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button 
                onClick={() => navigate('/register')}
                className="bg-white hover:bg-gray-100 text-[#5f259f] px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center group"
              >
                <Sparkles className="mr-3 w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Start Free Today</span>
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => window.open('https://gamma.app/docs/SolanaPay-Powering-the-Web3-Micro-Economy-a9zlnwnhhqgzp8s', '_blank')}
                className="bg-transparent hover:bg-white/10 text-white px-12 py-4 rounded-xl font-semibold text-lg transition-all duration-300 border-2 border-white/30 hover:border-white/50 flex items-center justify-center group"
              >
                <Play className="mr-3 w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Watch Demo</span>
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="text-white font-semibold mb-1">Bank-Level Security</div>
                <div className="text-purple-200 text-sm">256-bit encryption</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="text-white font-semibold mb-1">Instant Transfers</div>
                <div className="text-purple-200 text-sm">Under 3 seconds</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <div className="text-white font-semibold mb-1">Global Reach</div>
                <div className="text-purple-200 text-sm">150+ countries</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="text-white font-semibold mb-1">Trusted by Millions</div>
                <div className="text-purple-200 text-sm">2M+ active users</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="relative z-10 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Main Footer Content */}
          <div className="py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              {/* SolanaPay Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#5f259f] to-[#7c3aed] rounded-2xl flex items-center justify-center">
                    <span className="text-white font-bold text-xl">V</span>
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#5f259f] to-[#7c3aed] bg-clip-text text-transparent">SolanaPay</span>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Revolutionizing digital payments with cutting-edge Web3 technology. 
                  Secure, instant, and globally accessible.
                </p>
                
                {/* Social Links */}
                <div className="flex space-x-4">
                  <div className="w-10 h-10 bg-gray-800 hover:bg-[#5f259f] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 group">
                    <span className="text-sm font-bold group-hover:scale-110 transition-transform">f</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-800 hover:bg-[#5f259f] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 group">
                    <span className="text-sm font-bold group-hover:scale-110 transition-transform">t</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-800 hover:bg-[#5f259f] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 group">
                    <span className="text-xs font-bold group-hover:scale-110 transition-transform">in</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-800 hover:bg-[#5f259f] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 group">
                    <span className="text-xs font-bold group-hover:scale-110 transition-transform">ig</span>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="font-bold text-white mb-6 text-lg">Products</h3>
                <ul className="space-y-4">
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Personal Wallet</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Business Solutions</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Payment Gateway</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Mobile App</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">API Platform</a></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-bold text-white mb-6 text-lg">Resources</h3>
                <ul className="space-y-4">
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Documentation</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Help Center</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Security Guide</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Blog</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Community</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-bold text-white mb-6 text-lg">Company</h3>
                <ul className="space-y-4">
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">About Us</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Careers</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Press Kit</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Contact</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors hover:translate-x-1 transform duration-200 block">Support</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-800 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <div className="text-gray-400 text-sm">
                <p>&copy; 2025 SolanaPay Technologies. All rights reserved. Powering the future of digital payments.</p>
              </div>
              
              <div className="flex items-center space-x-8 text-sm">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Legal</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default SolanaPayLanding
