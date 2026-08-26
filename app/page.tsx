/**
 * Main Dashboard - Settlement Reconciliation Copilot
 * Dark theme analyst dashboard with match rate chart, exception table, and AI chat
 */

'use client'

import { useState, useEffect } from 'react'
import { MatchRateCard } from '@/components/MatchRateCard'
import { ExceptionTable } from '@/components/ExceptionTable'
import { ChatInterface } from '@/components/ChatInterface'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Settlement Reconciliation</h1>
              <p className="text-sm text-gray-400 mt-1">AI-powered transaction matching & exception analysis</p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match Rate Overview */}
            <MatchRateCard stats={stats} />

            {/* Two-column layout: Exceptions + Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exception Table */}
              <div className="lg:col-span-1">
                <ExceptionTable exceptions={exceptions} />
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-1">
                <ChatInterface />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
