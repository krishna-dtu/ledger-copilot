/**
 * Exception Table with filtering and transaction details
 */

'use client'

import { useState } from 'react'

interface Exception {
  id: number
  type: string
  internal_txn_id: string | null
  bank_txn_id: string | null
  detail: string
  resolved: boolean
}

interface ExceptionTableProps {
  exceptions: Exception[]
}

const EXCEPTION_TYPES = [
  'all',
  'amount_mismatch',
  'timing_lag',
  'missing_in_bank',
  'missing_in_ledger',
  'duplicate',
  'fee_mismatch',
]

const TYPE_COLORS: Record<string, string> = {
  amount_mismatch: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  timing_lag: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  missing_in_bank: 'bg-red-500/10 text-red-400 border-red-500/20',
  missing_in_ledger: 'bg-red-500/10 text-red-400 border-red-500/20',
  duplicate: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fee_mismatch: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export function ExceptionTable({ exceptions }: ExceptionTableProps) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' 
    ? exceptions 
    : exceptions.filter(e => e.type === filter)

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Exceptions</h2>
        <div className="text-sm text-gray-400">
          {filtered.length} of {exceptions.length}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {EXCEPTION_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-gray-800 rounded-lg">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No exceptions found
                  </td>
                </tr>
              ) : (
                filtered.map(exception => (
                  <tr key={exception.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${TYPE_COLORS[exception.type] || 'bg-gray-700 text-gray-300'}`}>
                        {exception.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {exception.internal_txn_id && (
                          <div className="text-blue-400">
                            L: {exception.internal_txn_id}
                          </div>
                        )}
                        {exception.bank_txn_id && (
                          <div className="text-green-400">
                            B: {exception.bank_txn_id}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-md">
                      {exception.detail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
