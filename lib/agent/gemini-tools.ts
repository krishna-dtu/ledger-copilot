/**
 * Gemini function calling tool definitions
 * Each tool is bound 1:1 to an API route
 */

export const tools = [
  {
    type: 'function',
    name: 'get_exceptions',
    description: 'Retrieves reconciliation exceptions/discrepancies. Can filter by exception type. Use this to answer questions about what went wrong, which transactions failed to match, or to count exceptions by type.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Optional filter by exception type. Valid values: missing_in_ledger, missing_in_bank, amount_mismatch, fee_mismatch, duplicate, timing_lag. Omit to get all exceptions.',
          enum: ['missing_in_ledger', 'missing_in_bank', 'amount_mismatch', 'fee_mismatch', 'duplicate', 'timing_lag'],
        },
        run_id: {
          type: 'number',
          description: 'Optional filter by reconciliation run ID. Omit to get exceptions from the latest run.',
        },
      },
    },
  },
  {
    type: 'function',
    name: 'get_transaction',
    description: 'Retrieves detailed information about a specific transaction by its transaction ID. Shows whether it exists in internal ledger, bank records, or both, along with full transaction details (amount, fee, date, merchant). Use this to investigate specific transactions mentioned in exceptions.',
    parameters: {
      type: 'object',
      properties: {
        txn_id: {
          type: 'string',
          description: 'The transaction ID to look up (e.g., TXN0001)',
        },
      },
      required: ['txn_id'],
    },
  },
  {
    type: 'function',
    name: 'get_match_rate',
    description: 'Retrieves the overall reconciliation match rate and summary statistics from the latest reconciliation run. Returns total records processed, how many matched, and the match rate percentage. Use this to answer questions about overall reconciliation health or success rate.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
]
