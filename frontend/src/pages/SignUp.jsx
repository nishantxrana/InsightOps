import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SignupForm } from '@/components/auth/SignupForm'
import { useTheme } from '@/contexts/ThemeContext'
import { Moon, Sun, ArrowLeft, Shield, Zap, Users } from 'lucide-react'

export default function SignUp() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Left Side - Subtle Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 relative">
          <div className="flex flex-col justify-center px-12">
            <Link to="/" className="flex items-center gap-3 mb-12">
              <img src="/icon.svg" alt="InsightOps" className="h-10 w-10" />
              <span className="text-2xl font-bold text-foreground">InsightOps</span>
            </Link>
            
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              Start monitoring smarter
            </h1>
            <p className="text-lg text-muted-foreground mb-12">
              Join thousands of teams using InsightOps for DevOps excellence.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Enterprise Security</h3>
                  <p className="text-sm text-muted-foreground">SOC2 compliant platform</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Real-time Monitoring</h3>
                  <p className="text-sm text-muted-foreground">Instant notifications and alerts</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Team Collaboration</h3>
                  <p className="text-sm text-muted-foreground">Seamless tool integration</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-4">
                <img src="/icon.svg" alt="InsightOps" className="h-8 w-8" />
                <span className="text-xl font-bold text-foreground">InsightOps</span>
              </Link>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>

            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Create account</h2>
              <p className="text-muted-foreground">Start your free trial. No credit card required.</p>
            </div>
            
            {/* Form */}
            <SignupForm />
            
            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link 
                to="/signin"
                className="text-blue-600 hover:text-blue-500 font-medium underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
