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

  // Only check connection if authenticated
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Temporarily disabled to prevent 429 errors
      // checkConnection()
      // const interval = setInterval(checkConnection, 30000)
      // return () => clearInterval(interval)
      
      // Set as connected by default
      setIsConnected(true)
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
