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

  async function handleDownloadDataset() {
    try {
      // Fetch all data
      const [statsRes, exceptionsRes] = await Promise.all([
        fetch('/api/reconcile'),
        fetch('/api/exceptions')
      ])

      const statsData = await statsRes.json()
      const exceptionsData = await exceptionsRes.json()

      // Fetch transaction details for each exception
      const transactionDetails = await Promise.all(
        exceptionsData.exceptions.slice(0, 5).map(async (ex: any) => {
          const txnId = ex.internal_txn_id || ex.bank_txn_id
          if (!txnId) return null
          try {
            const res = await fetch(`/api/transaction/${txnId}`)
            return await res.json()
          } catch {
            return null
          }
        })
      )

      // Build dataset
      const dataset = {
        metadata: {
          exported_at: new Date().toISOString(),
          run_id: statsData.run_id,
          run_date: statsData.created_at,
        },
        summary: {
          total_records: statsData.total_records,
          matched_count: statsData.matched_count,
          match_rate: statsData.match_rate,
          exception_count: statsData.exception_count,
        },
        exceptions: exceptionsData.exceptions,
        sample_transactions: transactionDetails.filter(Boolean),
        agent_implementation: {
          current: 'mock-agent',
          available: ['openai-agent', 'mock-agent'],
          note: 'OpenAI agent available in lib/agent/openai-agent.ts',
        }
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconciliation-dataset-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download dataset:', error)
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
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  {/* Professional Logo */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-6 h-6 text-white"
                    strokeWidth="2"
                  >
                    <path
                      d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 9L15 15M15 9L9 15"
                      stroke="currentColor"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white">Ledger Copilot</h1>
                  <p className="text-xs text-gray-400">Settlement reconciliation & analysis</p>
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
                onClick={handleDownloadDataset}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export Dataset</span>
              </button>
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

          {/* Agent Notice Banner */}
          <div className="pb-3">
            <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                <span className="text-amber-400 text-xs font-semibold">i</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-300">
                  <span className="font-medium">Demo Mode:</span> Currently using mock agent due to API billing limits. 
                  Full OpenAI integration is implemented in the codebase (<code className="px-1 py-0.5 bg-amber-500/10 rounded text-amber-200">lib/agent/openai-agent.ts</code>) 
                  and can be activated by updating <code className="px-1 py-0.5 bg-amber-500/10 rounded text-amber-200">app/api/ask/route.ts</code>.
                </p>
              </div>
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
            <HeroStats 
              stats={{
                ...stats,
                exception_count: exceptions.length // Use actual exception count from array
              }} 
              onExceptionClick={scrollToExceptions} 
            />

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
