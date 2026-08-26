/**
 * Exception Table Pro - Polished fintech analyst table
 * Segmented filter bar, stagger animations, row hover, detail drawer
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Layers, 
  AlertTriangle, 
  ArrowLeftRight, 
  DollarSign, 
  Clock,
  XCircle,
  X,
  ChevronRight,
  TrendingUp
} from 'lucide-react'

interface Exception {
  id: number
  type: string
  internal_txn_id: string | null
  bank_txn_id: string | null
  detail: string
  resolved: boolean
}

interface ExceptionTableProProps {
  exceptions: Exception[]
}

const EXCEPTION_TYPES = [
  { key: 'all', label: 'All', icon: null },
  { key: 'amount_mismatch', label: 'Amount Mismatch', icon: ArrowLeftRight, color: 'orange' },
  { key: 'timing_lag', label: 'Timing Lag', icon: Clock, color: 'yellow' },
  { key: 'missing_in_bank', label: 'Missing in Bank', icon: AlertTriangle, color: 'red' },
  { key: 'missing_in_ledger', label: 'Missing in Ledger', icon: XCircle, color: 'red' },
  { key: 'duplicate', label: 'Duplicate', icon: Layers, color: 'purple' },
  { key: 'fee_mismatch', label: 'Fee Mismatch', icon: DollarSign, color: 'blue' },
] as const

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  amount_mismatch: { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-400', 
    border: 'border-orange-500/20',
    icon: 'text-orange-400'
  },
  timing_lag: { 
    bg: 'bg-yellow-500/10', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500/20',
    icon: 'text-yellow-400'
  },
  missing_in_bank: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-400', 
    border: 'border-red-500/20',
    icon: 'text-red-400'
  },
  missing_in_ledger: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-400', 
    border: 'border-red-500/20',
    icon: 'text-red-400'
  },
  duplicate: { 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-400', 
    border: 'border-purple-500/20',
    icon: 'text-purple-400'
  },
  fee_mismatch: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-400', 
    border: 'border-blue-500/20',
    icon: 'text-blue-400'
  },
}

const ICON_MAP: Record<string, React.ElementType> = {
  amount_mismatch: ArrowLeftRight,
  timing_lag: Clock,
  missing_in_bank: AlertTriangle,
  missing_in_ledger: XCircle,
  duplicate: Layers,
  fee_mismatch: DollarSign,
}

export function ExceptionTablePro({ exceptions }: ExceptionTableProProps) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<Exception | null>(null)
  const shouldReduceMotion = useReducedMotion()

  // Count by type
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { all: exceptions.length }
    exceptions.forEach(ex => {
      counts[ex.type] = (counts[ex.type] || 0) + 1
    })
    return counts
  }, [exceptions])

  // Filtered data
  const filtered = useMemo(() => {
    let result = exceptions
    
    if (filter !== 'all') {
      result = result.filter(e => e.type === filter)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(e => 
        e.internal_txn_id?.toLowerCase().includes(searchLower) ||
        e.bank_txn_id?.toLowerCase().includes(searchLower) ||
        e.detail.toLowerCase().includes(searchLower)
      )
    }
    
    return result
  }, [exceptions, filter, search])

  return (
    <div className="relative rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Exceptions</h2>
            <p className="text-sm text-gray-400 mt-1">
              {filtered.length} of {exceptions.length} {filtered.length === 1 ? 'exception' : 'exceptions'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>

        {/* Segmented Filter Bar */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {EXCEPTION_TYPES.map((type) => {
              const count = countsByType[type.key] || 0
              const isActive = filter === type.key
              const Icon = type.icon

              return (
                <motion.button
                  key={type.key}
                  onClick={() => setFilter(type.key)}
                  whileHover={!shouldReduceMotion ? { y: -1 } : {}}
                  whileTap={!shouldReduceMotion ? { scale: 0.98 } : {}}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white/10 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:bg-white/[0.07] hover:text-gray-300'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{type.label}</span>
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-500'
                  }`}>
                    {count}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeFilter"
                      className="absolute inset-0 border-2 border-blue-500/50 rounded-lg"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState search={search} filter={filter} onClear={() => { setSearch(''); setFilter('all'); }} />
            ) : (
              <table className="min-w-full">
                <thead className="border-y border-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((exception, index) => (
                      <ExceptionRow
                        key={exception.id}
                        exception={exception}
                        index={index}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => setSelectedRow(exception)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        exception={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  )
}

interface ExceptionRowProps {
  exception: Exception
  index: number
  shouldReduceMotion: boolean
  onClick: () => void
}

function ExceptionRow({ exception, index, shouldReduceMotion, onClick }: ExceptionRowProps) {
  const colors = TYPE_COLORS[exception.type] || TYPE_COLORS.duplicate
  const Icon = ICON_MAP[exception.type] || AlertTriangle

  return (
    <motion.tr
      layout
      initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ 
        duration: 0.2, 
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.02, 0.3),
        layout: { type: 'spring', stiffness: 500, damping: 30 }
      }}
      className="group hover:bg-white/[0.03] cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-6 py-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border}`}>
          <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
          <span className={`text-xs font-medium ${colors.text}`}>
            {exception.type.replace(/_/g, ' ')}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="space-y-1">
          {exception.internal_txn_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">L:</span>
              <code className="text-sm font-mono text-blue-400">{exception.internal_txn_id}</code>
            </div>
          )}
          {exception.bank_txn_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">B:</span>
              <code className="text-sm font-mono text-emerald-400">{exception.bank_txn_id}</code>
            </div>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <p className="text-sm text-gray-300 line-clamp-2 max-w-md">
          {exception.detail}
        </p>
      </td>

      <td className="px-6 py-4 text-right">
        <button className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          <span>View</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </td>
    </motion.tr>
  )
}

interface EmptyStateProps {
  search: string
  filter: string
  onClear: () => void
}

function EmptyState({ search, filter, onClear }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 py-16 text-center"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
        <Search className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No exceptions found</h3>
      <p className="text-sm text-gray-400 mb-4">
        {search 
          ? `No results for "${search}"` 
          : filter !== 'all'
            ? `No ${filter.replace(/_/g, ' ')} exceptions`
            : 'No exceptions to display'
        }
      </p>
      {(search || filter !== 'all') && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
        >
          <X className="w-4 h-4" />
          Clear filters
        </button>
      )}
    </motion.div>
  )
}

interface DetailDrawerProps {
  exception: Exception | null
  onClose: () => void
}

function DetailDrawer({ exception, onClose }: DetailDrawerProps) {
  const [transactionData, setTransactionData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Fetch transaction details when drawer opens
  useEffect(() => {
    if (exception && (exception.internal_txn_id || exception.bank_txn_id)) {
      const txnId = exception.internal_txn_id || exception.bank_txn_id
      setLoading(true)
      fetch(`/api/transaction/${txnId}`)
        .then(res => res.json())
        .then(data => {
          setTransactionData(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [exception])

  if (!exception) return null

  const colors = TYPE_COLORS[exception.type] || TYPE_COLORS.duplicate
  const Icon = ICON_MAP[exception.type] || AlertTriangle

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl h-full bg-gray-950 border-l border-white/10 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border} mb-3`}>
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {exception.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">Exception Details</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
              <p className="text-base text-gray-200">{exception.detail}</p>
            </div>

            {/* Transaction IDs */}
            {(exception.internal_txn_id || exception.bank_txn_id) && (
              <div className="grid grid-cols-2 gap-4">
                {exception.internal_txn_id && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Ledger ID</div>
                    <code className="text-lg font-mono text-blue-400">{exception.internal_txn_id}</code>
                  </div>
                )}
                {exception.bank_txn_id && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Bank ID</div>
                    <code className="text-lg font-mono text-emerald-400">{exception.bank_txn_id}</code>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Comparison */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : transactionData && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Record Comparison</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Internal Record */}
                  {transactionData.internal_records?.[0] && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="text-xs text-blue-400 font-medium mb-3">Internal Ledger</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="font-mono text-white">₹{transactionData.internal_records[0].amount.toLocaleString('en-IN')}</span>
                        </div>
                        {transactionData.internal_records[0].fee !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fee:</span>
                            <span className="font-mono text-white">₹{transactionData.internal_records[0].fee}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="font-mono text-white">{transactionData.internal_records[0].date}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Record */}
                  {transactionData.bank_records?.[0] && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <div className="text-xs text-emerald-400 font-medium mb-3">Bank Record</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="font-mono text-white">₹{transactionData.bank_records[0].amount.toLocaleString('en-IN')}</span>
                        </div>
                        {transactionData.bank_records[0].fee !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fee:</span>
                            <span className="font-mono text-white">₹{transactionData.bank_records[0].fee}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="font-mono text-white">{transactionData.bank_records[0].date}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
