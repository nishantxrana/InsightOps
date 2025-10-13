'use client';
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
  VideoPlayerFullscreenButton,
  VideoPlayerLoadingIndicator,
} from '@/components/ui/shadcn-io/video-player'

export default function VideoModal({ isOpen, onClose, videoUrl }) {
  const { theme } = useTheme()
  const videoRef = useRef(null)
  
  // Cleanup video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      const video = videoRef.current
      video.pause()
      video.src = ''
      video.load() // This aborts any pending requests
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
        
        <VideoPlayer 
          key={isOpen ? 'open' : 'closed'} // Force re-render
          className="overflow-hidden rounded-lg border relative"
          style={{
            '--media-primary-color': theme === 'dark' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
            '--media-secondary-color': theme === 'dark' ? 'hsl(222.2 84% 4.9%)' : 'hsl(210 40% 98%)',
            '--media-text-color': theme === 'dark' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
            '--media-background-color': theme === 'dark' ? 'hsl(222.2 84% 4.9%)' : 'hsl(210 40% 98%)',
            '--media-control-hover-background': theme === 'dark' ? 'hsl(210 40% 3%)' : 'hsl(210 40% 96%)',
          }}
        >
          <VideoPlayerLoadingIndicator />
          <VideoPlayerContent
            ref={videoRef}
            preload="metadata"
            slot="media"
            src={videoUrl}
            autoPlay
            onError={(e) => {
              console.error('Video error:', e)
            }}
          />
          <VideoPlayerControlBar>
            <VideoPlayerPlayButton />
            <VideoPlayerSeekBackwardButton seekOffset={5} />
            <VideoPlayerSeekForwardButton seekOffset={5} />
            <VideoPlayerTimeRange />
            <VideoPlayerTimeDisplay showDuration />
            <VideoPlayerMuteButton />
            <VideoPlayerVolumeRange />
            <VideoPlayerFullscreenButton />
          </VideoPlayerControlBar>
        </VideoPlayer>
      </div>
    </div>
  )
}
