'use client';
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VideoModal({ isOpen, onClose, videoUrl }) {
  const videoRef = useRef(null)
  
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isOpen) {
      // Reset to beginning and play
      video.currentTime = 0
      video.play().catch(console.error)
    } else {
      // Pause but don't reset - keeps the video loaded
      video.pause()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl mx-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-10"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-auto"
            controls
            preload="metadata"
            poster="/demo-thumbnail.jpg"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  )
}
