'use client'
import { useState } from 'react'
import WatermarkGenerator from './WatermarkGenerator'

interface WatermarkButtonProps {
  photoId: string
  camera?: string | null
  filmStock?: string | null
  takenDate?: string | null
}

export default function WatermarkButton({ photoId, camera, filmStock, takenDate }: WatermarkButtonProps) {
  const [showGenerator, setShowGenerator] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowGenerator(true)}
        className="w-full text-center py-2 border border-brand text-brand text-sm hover:bg-brand hover:text-white transition-colors"
      >
        Download with Watermark
      </button>

      {showGenerator && (
        <WatermarkGenerator
          photoId={photoId}
          camera={camera}
          filmStock={filmStock}
          takenDate={takenDate}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </>
  )
}
