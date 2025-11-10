'use client';
import { useEffect, useRef, useState } from 'react'
import { X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VideoModal({ isOpen, onClose, videoUrl }) {
  const videoRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  

  
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const handleLoadedData = () => {
      setIsLoading(false)
      setHasError(false)
      setIsLoaded(true)
    }

    const handleError = (e) => {
      setIsLoading(false)
      setHasError(true)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('error', handleError)

    if (isOpen && videoUrl) {
      setIsLoading(!isLoaded)
      setHasError(false)
      video.currentTime = 0
      
      // Only load if not already loaded
      if (!isLoaded) {
        video.load()
      }
      
      // Try to play after a short delay
      setTimeout(() => {
        video.play().catch((error) => {
          // Autoplay failed (this is normal)
        })
      }, 100)
    } else {
      video.pause()
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('error', handleError)
    }
  }, [isOpen, videoUrl, isLoaded])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${!isOpen ? 'hidden' : ''}`}>
      <div className="relative w-full max-w-5xl mx-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-white text-lg">Loading video...</div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-white text-center">
                <div className="text-lg mb-2">Video failed to load</div>
                <div className="text-sm opacity-75 mb-4">URL: {videoUrl}</div>
                <Button 
                  onClick={() => window.open(videoUrl, '_blank')}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  Open Video in New Tab
                </Button>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="w-full h-auto"
            controls
            preload="auto"
            playsInline
            style={{ minHeight: '400px' }}
          >
            <source src={videoUrl} type="video/mp4" />
            <p className="text-white p-4">
              Your browser does not support the video tag. 
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="underline ml-2">
                Click here to watch the video
              </a>
            </p>
          </video>
        </div>
      </div>
    </div>
  )
}
