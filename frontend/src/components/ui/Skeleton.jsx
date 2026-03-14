import React from 'react'

export function Skeleton({ isDark = true, className = '' }) {
  const toneClass = isDark ? 'bg-slate-700/45' : 'bg-slate-300/80'
  return <div aria-hidden="true" className={`animate-pulse rounded-md ${toneClass} ${className}`} />
}
