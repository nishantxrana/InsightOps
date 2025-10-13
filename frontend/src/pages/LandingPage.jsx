import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Zap, Shield, BarChart3, Bot, Users, GitBranch, Moon, Sun, Play, Star, TrendingUp, Award, Globe, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
import VideoModal from '@/components/VideoModal'

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const [isVisible, setIsVisible] = useState({})
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const heroRef = useRef(null)
  
  const demoVideoUrl = import.meta.env.VITE_DEMO_VIDEO_URL || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  // Intersection Observer for scroll animations
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
      { threshold: 0.1, rootMargin: '50px' }
    )

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Mouse tracking for hero parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / rect.width,
          y: (e.clientY - rect.top - rect.height / 2) / rect.height
        })
      }
    }

    const hero = heroRef.current
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove)
      return () => hero.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const features = [
    {
      icon: Bot,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze your DevOps patterns and provide actionable insights.",
      gradient: "from-blue-500 to-blue-600",
      delay: "0ms"
    },
    {
      icon: BarChart3,
      title: "Real-time Monitoring",
      description: "Live dashboards with sub-second updates and intelligent alerting systems.",
      gradient: "from-blue-500 to-cyan-500",
      delay: "100ms"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption, SOC2 compliance, and zero-trust architecture.",
      gradient: "from-green-500 to-emerald-500",
      delay: "200ms"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Seamless integration with Slack, Teams, and Google Chat for unified workflows.",
      gradient: "from-blue-600 to-indigo-600",
      delay: "300ms"
    }
  ]

  const stats = [
    { value: "99.99%", label: "Uptime SLA", icon: TrendingUp },
    { value: "<50ms", label: "Response Time", icon: Zap },
    { value: "24/7", label: "Monitoring", icon: Globe },
    { value: "SOC2", label: "Compliant", icon: Award }
  ]

  const testimonials = [
    {
      quote: "InsightOps transformed our DevOps workflow. We've reduced deployment time by 60% and caught 95% more issues before production.",
      author: "Sarah Chen",
      role: "VP Engineering",
      company: "TechCorp",
      avatar: "SC"
    },
    {
      quote: "The AI insights are incredible. It's like having a senior DevOps engineer working 24/7 to optimize our processes.",
      author: "Marcus Rodriguez",
      role: "DevOps Lead",
      company: "InnovateLabs",
      avatar: "MR"
    },
    {
      quote: "Best investment we've made. The ROI was clear within the first month of implementation.",
      author: "Emily Watson",
      role: "CTO",
      company: "ScaleUp Inc",
      avatar: "EW"
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Advanced Header */}
      <header className="fixed top-0 w-full z-50 transition-all duration-300 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img 
                  src="/icon.svg" 
                  alt="InsightOps" 
                  className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-blue-500/20 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                InsightOps
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                Testimonials
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-500/10 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-md"></div>
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                ) : (
                  <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
                )}
              </Button>
              
              <Link to="/signin">
                <Button 
                  variant="ghost" 
                  className="relative overflow-hidden group"
                >
                  <span className="relative z-10">Sign In</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-500/10 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </Button>
              </Link>
              
              <Link to="/signup">
                <Button className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300">
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Advanced Animations */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50/30 via-background to-blue-50/20 dark:from-blue-950/20 dark:via-background dark:to-blue-950/10"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse"
            style={{
              transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`
            }}
          ></div>
          <div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse"
            style={{
              transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px)`,
              animationDelay: '1s'
            }}
          ></div>
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
          <div className="text-center">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium mb-6 border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm animate-fade-in-up">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Enterprise DevOps Platform</span>
            </div>

            {/* Main Heading with Gradient Animation */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="block text-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                AI-Powered
              </span>
              <span className="block text-transparent bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text animate-gradient-x animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                DevOps Monitoring
              </span>
            </h1>

            {/* Subtitle with Typewriter Effect */}
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              Transform your Azure DevOps workflows with{' '}
              <span className="text-blue-600 font-semibold">intelligent monitoring</span>,{' '}
              <span className="text-purple-600 font-semibold">automated insights</span>, and{' '}
              <span className="text-blue-600 font-semibold">real-time notifications</span>{' '}
              powered by cutting-edge AI technology.
            </p>

            {/* CTA Buttons with Advanced Hover Effects */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Link to="/signup">
                <Button 
                  size="default" 
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Play className="w-4 h-4" />
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                size="default"
                onClick={() => setIsVideoModalOpen(true)}
                className="px-6 py-2 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Watch Demo
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '1s' }}>
              <p className="text-xs text-muted-foreground mb-4">Built for modern development teams</p>
              <div className="flex items-center justify-center gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                {['Azure DevOps', 'OpenAI GPT-4', 'Google Gemini', 'Groq Llama', 'Real-time Analytics'].map((tech, i) => (
                  <div key={tech} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300" style={{ animationDelay: `${1.2 + i * 0.1}s` }}>
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Advanced Stats Section */}
      <section className="py-24 bg-background border-t border-blue-100/50 dark:border-blue-900/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/10 dark:via-transparent dark:to-purple-950/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                id={`stat-${index}`}
                data-animate
                className={`text-center group cursor-pointer transition-all duration-500 hover:scale-110 ${
                  isVisible[`stat-${index}`] ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative mb-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:rotate-6">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                </div>
                <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section id="features" className="py-32 bg-gradient-to-b from-background via-blue-50/20 to-background dark:via-blue-950/10 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-200/50 to-transparent dark:via-blue-800/50"></div>
          <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-purple-200/50 to-transparent dark:via-purple-800/50"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div 
            id="features-header"
            data-animate
            className={`text-center mb-20 ${isVisible['features-header'] ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-full text-sm font-medium mb-6 border border-blue-200/50 dark:border-blue-800/50">
              <Star className="w-4 h-4" />
              <span>Enterprise-Grade Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Everything you need to
              <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                monitor DevOps
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Comprehensive monitoring and analysis tools designed for modern development teams who demand excellence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                id={`feature-${index}`}
                data-animate
                className={`group relative transition-all duration-700 hover:scale-105 ${
                  isVisible[`feature-${index}`] ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: feature.delay }}
              >
                <Card className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 relative overflow-hidden group">
                  {/* Animated Border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                  <div className="absolute inset-[1px] bg-card rounded-lg"></div>
                  
                  <CardContent className="p-8 relative z-10">
                    <div className="relative mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className={`absolute inset-0 w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl opacity-0 group-hover:opacity-30 transition-all duration-500 blur-xl group-hover:scale-150`}></div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-blue-600 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                      {feature.description}
                    </p>
                    
                    {/* Hover Arrow */}
                    <div className="mt-6 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-2">
                      <span className="text-sm font-medium mr-2">Learn more</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 bg-gradient-to-br from-blue-50/30 via-background to-purple-50/30 dark:from-blue-950/10 dark:via-background dark:to-purple-950/10 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent dark:via-blue-800/50"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div 
            id="testimonials-header"
            data-animate
            className={`text-center mb-20 ${isVisible['testimonials-header'] ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Loved by development teams
              <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                worldwide
              </span>
            </h2>
            <div className="flex items-center justify-center gap-2 text-yellow-500 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-current animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
              <span className="ml-2 text-muted-foreground">4.9/5 from 2,000+ reviews</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                id={`testimonial-${index}`}
                data-animate
                className={`group transition-all duration-700 hover:scale-105 ${
                  isVisible[`testimonial-${index}`] ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <Card className="h-full bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <CardContent className="p-8 relative z-10">
                    <div className="flex items-center gap-2 text-yellow-500 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    
                    <blockquote className="text-foreground/90 mb-6 leading-relaxed italic">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Benefits Section */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div 
              id="benefits-content"
              data-animate
              className={`${isVisible['benefits-content'] ? 'animate-fade-in-up' : 'opacity-0'}`}
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                <span>Proven Results</span>
              </div>
              
              <h2 className="text-4xl font-bold text-foreground mb-8 leading-tight">
                Accelerate your development
                <span className="block text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                  workflow by 10x
                </span>
              </h2>
              
              <div className="space-y-6">
                {[
                  { text: "Automated build failure analysis with AI-powered solutions", metric: "95% faster resolution" },
                  { text: "Real-time sprint progress tracking and intelligent summaries", metric: "60% better visibility" },
                  { text: "Multi-platform notifications to keep teams synchronized", metric: "40% fewer meetings" },
                  { text: "Advanced pull request monitoring and idle detection", metric: "80% faster reviews" },
                  { text: "Comprehensive logging and audit trails", metric: "100% compliance" }
                ].map((benefit, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-4 group cursor-pointer transition-all duration-300 hover:translate-x-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-foreground/90 group-hover:text-foreground transition-colors duration-300 leading-relaxed">
                        {benefit.text}
                      </span>
                      <div className="text-sm text-blue-600 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {benefit.metric}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div 
              id="benefits-visual"
              data-animate
              className={`relative ${isVisible['benefits-visual'] ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: '200ms' }}
            >
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-3xl p-10 text-white shadow-2xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-500 transform hover:scale-105 hover:-rotate-1">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 bg-purple-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4 group/item cursor-pointer">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                      <Zap className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xl font-bold block">Lightning Fast</span>
                      <span className="text-white/80 text-sm">Sub-second response times</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group/item cursor-pointer">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                      <GitBranch className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xl font-bold block">DevOps Native</span>
                      <span className="text-white/80 text-sm">Built for Azure DevOps</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group/item cursor-pointer">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300">
                      <Bot className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xl font-bold block">AI-Powered</span>
                      <span className="text-white/80 text-sm">GPT-4, Gemini, Llama support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced CTA Section */}
      <section className="py-32 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div 
          id="cta-section"
          data-animate
          className={`max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10 ${
            isVisible['cta-section'] ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium mb-8 border border-white/20">
            <Sparkles className="w-4 h-4" />
            <span>Limited Time Offer</span>
          </div>
          
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Ready to transform your
            <span className="block text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text">
              DevOps workflow?
            </span>
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of teams already using InsightOps to streamline their development process and achieve 10x faster deployments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/signup">
              <Button 
                size="lg" 
                className="text-lg px-12 py-4 bg-white text-blue-600 hover:bg-blue-50 shadow-2xl hover:shadow-white/20 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Play className="w-5 h-5" />
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </Button>
            </Link>
            
            <div className="text-white/80 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>14-day free trial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-300 py-16 border-t border-blue-900/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/icon.svg" alt="InsightOps" className="h-10 w-10" />
                <span className="text-2xl font-bold text-white">InsightOps</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md leading-relaxed">
                The most advanced AI-powered DevOps monitoring platform. Transform your development workflow with intelligent insights and automation.
              </p>
              <div className="flex items-center gap-4">
                {['GitHub', 'Twitter', 'LinkedIn', 'Discord'].map((social) => (
                  <div key={social} className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110">
                    <span className="text-xs font-medium">{social[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Documentation', 'API Reference', 'Integrations'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact', 'Privacy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200 text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-slate-400 mb-4 md:mb-0">
              © 2024 InsightOps. All rights reserved. Built with ❤️ for developers.
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Security</a>
            </div>
          </div>
        </div>
      </footer>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={demoVideoUrl}
      />
    </div>
  )
}
