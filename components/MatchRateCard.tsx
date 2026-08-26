/**
 * Match Rate Card with visualization
 */

'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

interface MatchRateCardProps {
  stats: {
    total_records: number
    matched_count: number
    match_rate: number
    exception_count: number
  } | null
}

export function MatchRateCard({ stats }: MatchRateCardProps) {
  if (!stats) {
    return <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">No data</div>
  }

  const matchRate = (stats.match_rate * 100).toFixed(1)
  const exceptionRate = ((stats.exception_count / stats.total_records) * 100).toFixed(1)

  const chartData = [
    { name: 'Matched', value: stats.matched_count, color: '#10b981' },
    { name: 'Exceptions', value: stats.exception_count, color: '#ef4444' },
  ]

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Reconciliation Overview</h2>
        <div className="text-sm text-gray-400">
          Latest Run: {new Date(stats.created_at).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats */}
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Match Rate</div>
            <div className="text-3xl font-bold text-green-400">{matchRate}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.matched_count.toLocaleString()} of {stats.total_records.toLocaleString()} records
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Exceptions</div>
            <div className="text-3xl font-bold text-red-400">{stats.exception_count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {exceptionRate}% of total records
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Records</div>
            <div className="text-3xl font-bold text-blue-400">{stats.total_records.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              Internal + Bank transactions
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-gray-300 text-sm">
                    {value}: {entry.payload.value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
