import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/auth/LoginForm'
import { useTheme } from '@/contexts/ThemeContext'
import { Moon, Sun, ArrowLeft } from 'lucide-react'

export default function SignIn() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="flex min-h-screen">
        {/* Left Side - Enhanced Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50/50 to-slate-50 dark:from-blue-950/20 dark:to-slate-900 relative">
          <div className="flex flex-col justify-center px-12 w-full">
            <Link to="/" className="flex items-center gap-3 mb-12 group">
              <img src="/icon.svg" alt="InsightOps" className="h-10 w-10 group-hover:scale-105 transition-transform" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">InsightOps</span>
            </Link>
            
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
              Welcome back
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Continue monitoring your DevOps workflows with intelligent insights.
            </p>
          </div>
        </div>

        {/* Right Side - Enhanced Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <img src="/icon.svg" alt="InsightOps" className="h-8 w-8 group-hover:scale-105 transition-transform" />
                <span className="text-xl font-bold text-slate-900 dark:text-white">InsightOps</span>
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h1>
              <p className="text-slate-600 dark:text-slate-400">Sign in to your account</p>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-10 h-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>

            {/* Enhanced Form Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sign in</h2>
                <p className="text-slate-600 dark:text-slate-400">Enter your credentials to continue</p>
              </div>
              
              <LoginForm />
              
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                  Don't have an account?{' '}
                  <Link 
                    to="/signup"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
