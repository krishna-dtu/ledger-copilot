/**
 * Main Dashboard - Settlement Reconciliation Copilot
 * Polished fintech analyst dashboard with persistent top bar and re-run functionality
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { HeroStats } from '@/components/HeroStats'
import { ExceptionTablePro } from '@/components/ExceptionTablePro'
import { ChatInterfacePro } from '@/components/ChatInterfacePro'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const exceptionsRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const scrollToExceptions = () => {
    exceptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Fetch reconciliation stats
      const statsRes = await fetch('/api/reconcile')
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch exceptions
      const exceptionsRes = await fetch('/api/exceptions')
      const exceptionsData = await exceptionsRes.json()
      setExceptions(exceptionsData.exceptions || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRerun() {
    setRerunning(true)
    try {
      // Run reconciliation
      const response = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) {
        throw new Error('Reconciliation failed')
      }

      // Reload data
      await loadData()
      
      // Show success toast
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Failed to re-run reconciliation:', error)
    } finally {
      setRerunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Persistent Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-5 h-5 text-white"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">Settlement Reconciliation</h1>
                  <p className="text-xs text-gray-400">Transaction matching & analysis</p>
                </div>
              </div>

              {/* Current Run Info */}
              {stats && (
                <div className="hidden md:flex items-center gap-2 ml-6 pl-6 border-l border-white/10">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">
                    Last run: <span className="text-gray-300">{new Date(stats.created_at).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRerun}
                disabled={rerunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <motion.div
                  animate={rerunning && !shouldReduceMotion ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: rerunning ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                <span className="hidden sm:inline">
                  {rerunning ? 'Running...' : 'Re-run Reconciliation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-sm shadow-xl"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-emerald-400">Reconciliation Complete</div>
              <div className="text-xs text-emerald-400/70">Data has been updated</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <motion.div
            key={stats?.run_id}
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Hero Stats Overview */}
            <HeroStats stats={stats} onExceptionClick={scrollToExceptions} />

            {/* Two-column layout: Exceptions + Chat */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Exception Table */}
              <div ref={exceptionsRef} className="xl:col-span-1">
                <ExceptionTablePro exceptions={exceptions} />
              </div>

              {/* Chat Interface */}
              <div className="xl:col-span-1">
                <ChatInterfacePro />
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Mobile Responsive Notice */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
            <span className="text-amber-400 text-xs">!</span>
          </div>
          <p className="text-xs text-amber-400">
            Best viewed on desktop for full data analysis experience.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="h-64 bg-white/5 animate-pulse rounded-xl border border-white/10" />
      
      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[600px] bg-white/5 animate-pulse rounded-xl border border-white/10" />
        <div className="h-[600px] bg-white/5 animate-pulse rounded-xl border border-white/10" />
      </div>
    </div>
  )
}
