import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../api/apiService'

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
  const [isChecking, setIsChecking] = useState(true)
  const [healthData, setHealthData] = useState(null)
  const [lastCheck, setLastCheck] = useState(null)

  // Check backend connectivity
  const checkConnection = async () => {
    setIsChecking(true)
    try {
      const data = await apiService.getHealth()
      setIsConnected(true)
      setHealthData(data)
      setLastCheck(new Date())
    } catch (error) {
      setIsConnected(false)
      setHealthData(null)
    } finally {
      setIsChecking(false)
    }
  }

  // Check connection on mount and set up periodic checks
  useEffect(() => {
    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const value = {
    isConnected,
    isChecking,
    healthData,
    lastCheck,
    checkConnection // Manual refresh function
  }

  return (
    <HealthContext.Provider value={value}>
      {children}
    </HealthContext.Provider>
  )
}
