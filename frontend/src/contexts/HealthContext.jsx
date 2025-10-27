import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const HealthContext = createContext()

export const useHealth = () => {
  const context = useContext(HealthContext)
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider')
  }
  return context
}

export const HealthProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [healthData, setHealthData] = useState(null)
  const [lastCheck, setLastCheck] = useState(null)

  // Check backend connectivity
  const checkConnection = async () => {
    // Only check if user is authenticated (has token)
    const token = localStorage.getItem('token')
    if (!token) {
      setIsConnected(false)
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    try {
      const response = await axios.get('/api/health')
      setIsConnected(true)
      setHealthData(response.data)
      setLastCheck(new Date())
    } catch (error) {
      setIsConnected(false)
      setHealthData(null)
    } finally {
      setIsChecking(false)
    }
  }

  // Check connection when component mounts and set up interval
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Initial check
      checkConnection()
      
      // Check every 5 minutes
      const interval = setInterval(checkConnection, 300000)
      return () => clearInterval(interval)
    } else {
      // Reset state when no token
      setIsConnected(false)
      setHealthData(null)
      setIsChecking(false)
    }
  }, [])

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token')
      if (token) {
        // User just logged in, check connection immediately
        checkConnection()
      } else {
        // User logged out, reset state
        setIsConnected(false)
        setHealthData(null)
        setIsChecking(false)
      }
    }

    // Custom event listener for auth changes
    window.addEventListener('auth-change', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const value = {
    isConnected,
    isChecking,
    healthData,
    lastCheck,
    checkConnection
  }

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  )
}
