/**
 * Hero Stats Section - Polished fintech analyst view
 * Match rate with animated count-up, radial progress, breakdown bar
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import CountUp from 'react-countup'
import { CheckCircle2, AlertCircle, Database, TrendingUp, TrendingDown } from 'lucide-react'

interface HeroStatsProps {
  stats: {
    total_records: number
    matched_count: number
    match_rate: number
    exception_count: number
    created_at: string
  } | null
  onExceptionClick?: () => void
}

interface ExceptionBreakdown {
  type: string
  count: number
  color: string
  label: string
}

export function HeroStats({ stats, onExceptionClick }: HeroStatsProps) {
  const [mounted, setMounted] = useState(false)
  const [prevMatchRate, setPrevMatchRate] = useState(0)
  const shouldReduceMotion = useReducedMotion()
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
    } else if (stats) {
      // Update previous match rate for animations on data refresh
      setPrevMatchRate(stats.match_rate * 100)
    }
  }, [mounted, stats])

  if (!stats) {
    return (
      <div className="space-y-6">
        {/* Skeleton */}
        <div className="h-48 bg-white/5 animate-pulse rounded-xl border border-white/10" />
      </div>
    )
  }

  const matchRate = stats.match_rate * 100
  const exceptionRate = (stats.exception_count / stats.total_records) * 100

  // Mock breakdown - in real implementation, fetch from API
  const exceptionBreakdown: ExceptionBreakdown[] = [
    { type: 'amount_mismatch', count: 5, color: '#f97316', label: 'Amount Mismatch' },
    { type: 'timing_lag', count: 3, color: '#eab308', label: 'Timing Lag' },
    { type: 'missing_in_bank', count: 5, color: '#ef4444', label: 'Missing in Bank' },
    { type: 'missing_in_ledger', count: 5, color: '#dc2626', label: 'Missing in Ledger' },
    { type: 'duplicate', count: 2, color: '#a855f7', label: 'Duplicate' },
  ]

  const duration = shouldReduceMotion ? 0 : 0.8

  return (
    <div className="space-y-6">
      {/* Hero Match Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] backdrop-blur-sm p-8"
      >
        <div className="flex items-center justify-between">
          {/* Left: Primary Match Rate */}
          <div className="flex items-center gap-8">
            {/* Radial Progress Ring */}
            <div className="relative">
              <svg width="120" height="120" className="transform -rotate-90">
                {/* Background ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/5"
                />
                {/* Progress ring */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - matchRate / 100) }}
                  transition={{ duration, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums text-white">
                    {mounted ? (
                      <CountUp 
                        start={prevMatchRate} 
                        end={matchRate} 
                        decimals={1} 
                        duration={duration} 
                        suffix="%" 
                      />
                    ) : (
                      '0%'
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Match</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Match Rate</div>
                <div className="text-4xl font-bold tabular-nums text-white tracking-tight">
                  {mounted ? (
                    <CountUp 
                      start={prevMatchRate} 
                      end={matchRate} 
                      decimals={1} 
                      duration={duration} 
                      suffix="%" 
                    />
                  ) : (
                    '0%'
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">+2.3%</span>
                  <span className="text-sm text-gray-500">vs last run</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Secondary Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Matched */}
            <StatCard
              icon={CheckCircle2}
              label="Matched"
              value={stats.matched_count}
              total={stats.total_records}
              color="emerald"
              trend={+1.2}
              mounted={mounted}
              duration={duration}
            />

            {/* Exceptions */}
            <StatCard
              icon={AlertCircle}
              label="Exceptions"
              value={stats.exception_count}
              total={stats.total_records}
              color="amber"
              trend={-0.5}
              mounted={mounted}
              duration={duration}
              onClick={onExceptionClick}
              clickable
            />

            {/* Total Records */}
            <StatCard
              icon={Database}
              label="Total Records"
              value={stats.total_records}
              color="blue"
              mounted={mounted}
              duration={duration}
            />
          </div>
        </div>

        {/* Exception Breakdown Bar */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Exception Breakdown</div>
            <div className="text-xs text-gray-500">{stats.exception_count} total</div>
          </div>
          
          <div className="relative h-3 bg-white/5 rounded-full overflow-hidden flex">
            {exceptionBreakdown.map((segment, index) => {
              const width = (segment.count / stats.exception_count) * 100
              return (
                <motion.div
                  key={segment.type}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration, delay: index * 0.05, ease: 'easeOut' }}
                  className="relative group cursor-pointer"
                  style={{ backgroundColor: segment.color }}
                  onMouseEnter={() => setHoveredSegment(segment.type)}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  {hoveredSegment === segment.type && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl whitespace-nowrap z-10"
                    >
                      <div className="text-xs font-medium text-white">{segment.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {segment.count} ({((segment.count / stats.exception_count) * 100).toFixed(1)}%)
                      </div>
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 border-r border-b border-white/10"
                        style={{ backgroundColor: '#1f2937' }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            {exceptionBreakdown.map((segment) => (
              <div key={segment.type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs text-gray-400">{segment.label}</span>
                <span className="text-xs text-gray-500 tabular-nums">({segment.count})</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  total?: number
  color: 'emerald' | 'amber' | 'blue'
  trend?: number
  mounted: boolean
  duration: number
  onClick?: () => void
  clickable?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  total,
  color,
  trend,
  mounted,
  duration,
  onClick,
  clickable,
}: StatCardProps) {
  const shouldReduceMotion = useReducedMotion()
  
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  const hoverClasses = clickable
    ? 'cursor-pointer hover:bg-white/[0.08] active:bg-white/[0.06]'
    : ''

  return (
    <motion.div
      whileHover={!shouldReduceMotion && clickable ? { y: -2 } : {}}
      onClick={onClick}
      className={`relative rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm transition-colors ${hoverClasses}`}
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${colorClasses[color]} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold tabular-nums text-white">
          {mounted ? (
            <CountUp end={value} duration={duration} />
          ) : (
            '0'
          )}
        </div>
        {total && (
          <div className="text-sm text-gray-500 tabular-nums">
            / {total}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span className={`text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        </div>
      )}
    </motion.div>
  )
}
