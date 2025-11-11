import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Bot,
  Users,
  GitBranch,
  Moon,
  Sun,
  Play,
  Star,
  TrendingUp,
  Award,
  Globe,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import VideoModal from "@/components/VideoModal";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Docs", href: "#docs" },
];

const FEATURE_CARDS = [
  {
    icon: Bot,
    title: "AI-powered insights",
    description:
      "Diagnose flaky builds with context-aware remediation steps trained on your pipelines, logs, and recent incidents.",
    accent: "from-sky-500/25 via-blue-500/10 to-transparent",
  },
  {
    icon: BarChart3,
    title: "Live observability",
    description:
      "Stream sprint velocity, deployment frequency, and lead time metrics to a single real-time control plane.",
    accent: "from-indigo-500/20 via-slate-500/10 to-transparent",
  },
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description:
      "SOC2 compliant, SSO-ready, and fully auditable with end-to-end encryption and granular workspace roles.",
    accent: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
  {
    icon: Users,
    title: "Collaboration built-in",
    description:
      "Trigger rich alerts to Slack, Teams, and Google Chat with adaptive routing, ownership, and huddles.",
    accent: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  {
    icon: GitBranch,
    title: "Native Azure DevOps",
    description:
      "Two-way sync across boards, pipelines, repos, and releases with frictionless onboarding for large orgs.",
    accent: "from-purple-500/20 via-slate-500/10 to-transparent",
  },
  {
    icon: Zap,
    title: "Operational excellence",
    description:
      "Compare DORA metrics across teams, forecast risk, and automate go/no-go decisions with predictive scoring.",
    accent: "from-amber-500/25 via-orange-500/10 to-transparent",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA", icon: TrendingUp, suffix: "" },
  { value: "50", label: "Response Time", icon: Zap, suffix: "ms" },
  { value: "10k+", label: "Daily Events", icon: Globe, suffix: "" },
  { value: "SOC2", label: "Compliant", icon: Award, suffix: "" }
];

const KEY_METRICS = [
  {
    value: "99.99%",
    label: "Uptime guarantee",
    description: "Global redundancy with proactive health checks.",
    icon: TrendingUp,
  },
  {
    value: "<50ms",
    label: "Event latency",
    description: "Streaming ingestion keeps dashboards live.",
    icon: Zap,
  },
  {
    value: "24/7",
    label: "Expert support",
    description: "Follow-the-sun response led by SREs.",
    icon: Globe,
  },
  {
    value: "SOC2",
    label: "Compliance ready",
    description: "Audited security, signed DPA, and logging.",
    icon: Award,
  },
];

const TRUST_POINTS = [
  "Free 14-day trial",
  "SOC2 & GDPR ready",
  "No credit card required",
];

const PARTNER_LOGOS = [
  "Azure DevOps",
  "GitHub",
  "Slack",
  "Microsoft Teams",
  "PagerDuty",
  "Jira",
];

const DOCS_TIMELINE = [
  {
    icon: GitBranch,
    title: "Connect Azure DevOps",
    description:
      "Authenticate once and select the projects to mirror. InsightOps validates webhooks automatically.",
  },
  {
    icon: Bot,
    title: "Enable AI copilots",
    description:
      "Toggle GPT-4, Gemini, or Llama driven remediation tuned for your stack, pipelines, and alerts.",
  },
  {
    icon: Shield,
    title: "Harden governance",
    description:
      "Enforce SSO, SCIM, conditional access, and approval workflows without slowing teams down.",
  },
  {
    icon: BarChart3,
    title: "Ship with clarity",
    description:
      "Visualize delivery timelines, risk heatmaps, and post-incident intelligence in one guided workspace.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "InsightOps is the first platform that catches regression risk before it hits master. We cut incident volume by 63% in a quarter.",
    author: "Sarah Chen",
    role: "VP Engineering",
    company: "TechFlow",
    avatar: "SC",
  },
  {
    quote:
      "Our on-call fatigue vanished. The AI summaries land in Slack with context, actions, and owners so we resolve issues 4× faster.",
    author: "Marcus Rodriguez",
    role: "DevOps Lead",
    company: "BuildLab",
    avatar: "MR",
  },
  {
    quote:
      "Rolling out to 30 squads took a week. InsightOps feels handcrafted for Azure DevOps and pays for itself every sprint.",
    author: "Emily Watson",
    role: "CTO",
    company: "DevCorp",
    avatar: "EW",
  },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [isVisible, setIsVisible] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const heroRef = useRef(null);

  // Handle video modal opening with extension bypass
  const handleWatchDemo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoModalOpen(true);
  };

  const demoVideoUrl =
    import.meta.env.VITE_DEMO_VIDEO_URL ||
    "https://insightopssa.blob.core.windows.net/insightops-demo/insightops-demo.mp4";
  import.meta.env.VITE_DEMO_VIDEO_URL ||
    "https://insightopssa.blob.core.windows.net/insightops-demo/insightops-demo.mp4";

  // Scroll handler for header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute("data-animate");
          if (!key) return;

          setIsVisible((prev) => {
            if (prev[key] === entry.isIntersecting) {
              return prev;
            }
            return { ...prev, [key]: entry.isIntersecting };
          });

          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    document
      .querySelectorAll("[data-animate]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Mouse tracking for hero parallax
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      setMousePosition({ x, y });
    };

    const handleMouseLeave = () => setMousePosition({ x: 0, y: 0 });

    const hero = heroRef.current;
    if (!hero) return;

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  const animateClass = (key) =>
    isVisible[key]
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-10 md:translate-y-12";

  const heroParallaxStyle = {
    transform: `translate3d(${mousePosition.x * 16}px, ${
      mousePosition.y * 16
    }px, 0)`,
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* Enhanced Header */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-lg shadow-slate-900/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img
                  src="/icon.svg"
                  alt="InsightOps"
                  className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg scale-0 group-hover:scale-125 transition-transform duration-500 -z-10"></div>
              </div>
              <span className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                InsightOps
              </span>
            </Link>

            <nav className="hidden lg:flex items-center space-x-10">
              <a
                href="#features"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-900 dark:bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 relative group"
              >
                Testimonials
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-900 dark:bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a
                href="#docs"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 relative group"
              >
                Docs
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-900 dark:bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              <Link to="/signin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Sign In
                </Button>
              </Link>

              <Link to="/signup">
                <Button
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-medium px-6 h-10 shadow-lg shadow-slate-900/25 hover:shadow-slate-900/40 transition-all duration-300 hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-32 px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900"
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]"></div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Status badge */}
          <div className="inline-flex items-center space-x-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 mb-8 border border-slate-200/50 dark:border-slate-700/50 animate-fade-in-up">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Now supporting GPT-4, Gemini, and Llama models
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1] animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            DevOps monitoring
            <br />
            <span className="text-slate-600 dark:text-slate-400">
              that actually works
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            AI-powered insights for Azure DevOps. Monitor builds, track sprints,
            and catch issues before they reach production.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16 animate-fade-in-up"
            style={{ animationDelay: "0.6s" }}
          >
            <Link to="/signup">
              <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-8 h-12 text-base font-semibold shadow-xl shadow-slate-900/25 hover:shadow-slate-900/40 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>

            <button
              onClick={handleWatchDemo}
              onMouseDown={handleWatchDemo}
              className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-200 group"
              type="button"
            >
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors duration-200">
                <Play className="w-4 h-4 ml-0.5" />
              </div>
              <span className="font-medium">Watch demo</span>
            </button>
          </div>

          {/* Trust indicators */}
          <div
            className="text-sm text-slate-500 dark:text-slate-500 space-y-2 animate-fade-in-up"
            style={{ animationDelay: "0.8s" }}
          >
            <p className="font-medium">
              Free 14-day trial • No credit card required
            </p>
            <div className="flex items-center justify-center space-x-6 text-xs">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>SOC2 Compliant</span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>99.9% Uptime</span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>24/7 Support</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 lg:px-8 bg-slate-900 dark:bg-slate-900 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center group"
                data-animate
                id={`stat-${index}`}
              >
                <div className="flex items-center justify-center mb-3">
                  <stat.icon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="text-4xl font-bold text-white mb-2 group-hover:scale-105 transition-transform duration-300">
                  {stat.value}{stat.suffix && <span className="text-2xl text-blue-400">{stat.suffix}</span>}
                </div>
                <div className="text-sm font-medium text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section
        id="features"
        className="py-20 px-6 lg:px-8 bg-slate-50/50 dark:bg-slate-900/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1 text-xs font-medium mb-4">
              <Star className="w-3 h-3" />
              <span>Enterprise-grade platform</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Everything you need for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                DevOps excellence
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Comprehensive monitoring and analysis tools designed for modern
              development teams.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: "AI-Powered Analysis",
                description:
                  "Intelligent build failure analysis with specific fix recommendations using GPT-4, Gemini, and Llama models.",
              },
              {
                icon: BarChart3,
                title: "Real-time Monitoring",
                description:
                  "Live dashboards showing sprint progress, build status, and pull request metrics with sub-second updates.",
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description:
                  "SOC2 compliant with enterprise-grade security, SSO integration, and comprehensive audit logging.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Smart notifications to Slack, Teams, and Google Chat with customizable rules and rich formatting.",
              },
              {
                icon: GitBranch,
                title: "DevOps Integration",
                description:
                  "Native Azure DevOps integration with webhooks, comprehensive API coverage, and real-time sync.",
              },
              {
                icon: Zap,
                title: "Performance Insights",
                description:
                  "Detailed analytics on deployment frequency, lead time, failure recovery, and team productivity metrics.",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group border-0 bg-white dark:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/10 dark:hover:shadow-slate-900/20 transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer"
              >
                <CardContent className="p-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                    <span className="text-xs font-medium mr-1">Learn more</span>
                    <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section
        id="testimonials"
        className="py-20 px-6 lg:px-8 bg-white dark:bg-slate-950"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight text-balance">
              Loved by development teams
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                worldwide
              </span>
            </h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm ml-3">
                4.9/5 from 2,000+ reviews
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "InsightOps cut our deployment debugging time by 70%. The AI analysis is incredibly accurate and saves us hours every week.",
                author: "Sarah Chen",
                role: "Engineering Manager",
                company: "TechFlow",
                avatar: "SC",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                quote:
                  "Finally, a monitoring tool that understands our Azure DevOps workflow. The real-time insights are game-changing for our team.",
                author: "Marcus Rodriguez",
                role: "DevOps Lead",
                company: "BuildLab",
                avatar: "MR",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                quote:
                  "The AI-powered build failure analysis is like having a senior engineer available 24/7. Best investment we've made this year.",
                author: "Emily Watson",
                role: "CTO",
                company: "DevCorp",
                avatar: "EW",
                gradient: "from-emerald-500 to-teal-500"
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="group border-0 bg-white dark:bg-slate-800/50 shadow-soft hover:shadow-soft-lg transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${testimonial.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <CardContent className="p-8">
                  {/* Stars */}
                  <div className="flex items-center space-x-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform duration-300"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-slate-700 dark:text-slate-300 mb-8 leading-relaxed text-base">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${testimonial.gradient} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-base">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {testimonial.role}
                      </div>
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-32 px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Ready to get started?</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
            Transform your DevOps workflow
            <br />
            <span className="text-slate-300">with AI-powered monitoring</span>
          </h2>

          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Start monitoring your Azure DevOps workflow today. Catch issues
            before they reach production and accelerate your development
            process.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/signup">
              <Button className="bg-white hover:bg-slate-100 text-slate-900 px-8 h-12 text-base font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                <Play className="w-4 h-4 mr-2" />
                Get started now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <button
              onClick={handleWatchDemo}
              onMouseDown={handleWatchDemo}
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors duration-200 font-medium"
              type="button"
            >
              <span>Watch demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-slate-400">
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Free to get started</span>
            </span>
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Setup in minutes</span>
            </span>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-20 px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <img src="/icon.svg" alt="InsightOps" className="h-8 w-8" />
                <span className="text-xl font-semibold text-slate-900 dark:text-white">
                  InsightOps
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-md">
                The most advanced AI-powered DevOps monitoring platform for
                modern development teams who demand excellence.
              </p>
              <div className="flex items-center space-x-4">
                {["Twitter", "GitHub", "LinkedIn", "Discord"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                  >
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {social[0]}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wide">
                Product
              </h4>
              <ul className="space-y-3">
                {[
                  "Features",
                  "Documentation",
                  "API Reference",
                  "Integrations",
                  "Changelog",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wide">
                Company
              </h4>
              <ul className="space-y-3">
                {[
                  "About Us",
                  "Blog",
                  "Careers",
                  "Press Kit",
                  "Contact",
                  "Partners",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wide">
                Support
              </h4>
              <ul className="space-y-3">
                {[
                  "Help Center",
                  "Community",
                  "Status Page",
                  "Security",
                  "Privacy Policy",
                  "Terms of Service",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-slate-500 dark:text-slate-500">
              © 2024 InsightOps. All rights reserved. Built with ❤️ for
              developers.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <a
                href="#"
                className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Security
              </a>
              <a
                href="#"
                className="text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cookies
              </a>
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
  );
}
