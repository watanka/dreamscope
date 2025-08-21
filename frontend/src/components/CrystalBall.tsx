import React, { useState } from 'react'

type Props = {
  active?: boolean
  size?: number // diameter in px
}

export default function CrystalBall({ active, size = 240 }: Props) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dx = (e.clientX - cx) / (r.width / 2)
    const dy = (e.clientY - cy) / (r.height / 2)
    const max = 10 // max tilt degrees
    setTilt({ x: -(dy * max), y: dx * max })
  }

  function onLeave() {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div
      className={`crystal-ball ${active ? 'active' : ''} relative mx-auto`}
      style={{ width: size, height: size }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Ambient glow */}
      <div className={`absolute -inset-6 rounded-full blur-3xl transition-opacity duration-500 ${active ? 'opacity-80' : 'opacity-40'}`}
           style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(99,102,241,0.35), rgba(34,197,94,0.0))' }}
      />

      {/* Aurora aura */}
      <div className="absolute inset-0 rounded-full crystal-aurora" />

      {/* Sphere */}
      <div
        className="sphere relative h-full w-full rounded-full border border-indigo-400/25 shadow-[0_0_80px_-10px_rgba(99,102,241,0.6)]"
        style={{
          background:
            'radial-gradient(120% 120% at 30% 25%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 22%, rgba(17,24,39,1) 65%), radial-gradient(100% 100% at 70% 80%, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.18) 30%, rgba(2,6,23,1) 70%)',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Specular shine */}
        <div className="shine absolute inset-0 rounded-full" />

        {/* Sparkles */}
        <div className="crystal-sparkles pointer-events-none absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>

      {/* Base / shadow */}
      <div className={`crystal-shadow absolute -bottom-3 left-1/2 h-5 w-1/2 -translate-x-1/2 rounded-full ${active ? 'opacity-90' : 'opacity-60'}`} />
    </div>
  )
}
