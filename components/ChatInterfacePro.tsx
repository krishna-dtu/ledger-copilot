/**
 * Chat Interface Pro - Polished fintech analyst chat
 * Structured analyst output, inline chips, animated reasoning indicators
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Send, Sparkles, Zap, Database, FileSearch, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  tool_calls?: ToolCall[]
}

interface ToolCall {
  name: string
  args: Record<string, any>
  result: any
}

const EXAMPLE_PROMPTS = [
  'What is the current match rate?',
  'Show me timing lag exceptions',
  'Tell me about transaction TXN0046',
  'How many amount mismatches are there?',
]

const TOOL_ICONS: Record<string, React.ElementType> = {
  get_match_rate: Database,
  get_exceptions: FileSearch,
  get_transaction: Zap,
}

export function ChatInterfacePro() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you analyze reconciliation results. I\'ll always cite specific transaction IDs and call tools to verify data before stating any numbers.',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        tool_calls: data.tool_calls,
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[700px] rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            <p className="text-xs text-gray-400">Intelligent Pattern Matching</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            index={index}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
        
        {loading && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts (only show if no user messages yet) */}
      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <div className="text-xs text-gray-500 mb-3">Try asking:</div>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <motion.button
                key={i}
                onClick={() => handlePromptClick(prompt)}
                whileHover={!shouldReduceMotion ? { y: -2 } : {}}
                whileTap={!shouldReduceMotion ? { scale: 0.98 } : {}}
                className="px-3 py-2 text-left text-sm text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-6 pt-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about reconciliation results..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  index: number
  shouldReduceMotion: boolean
}

function MessageBubble({ message, index, shouldReduceMotion }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : 0.05 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tool Calls */}
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.tool_calls.map((call, i) => (
              <ToolCallChip key={i} call={call} index={i} shouldReduceMotion={shouldReduceMotion} />
            ))}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-xl ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white/5 border border-white/10 text-gray-100'
          }`}
        >
          <MessageContent content={message.content} isUser={isUser} />
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </motion.div>
  )
}

interface MessageContentProps {
  content: string
  isUser: boolean
}

function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <div className="text-sm whitespace-pre-wrap">{content}</div>
  }

  // Parse transaction IDs and exception types into chips
  const parts = content.split(/(\bTXN\d+\b|amount mismatch|timing lag|missing in bank|missing in ledger|duplicate|fee mismatch)/gi)

  return (
    <div className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        // Transaction ID chip
        if (/^TXN\d+$/i.test(part)) {
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 mx-1 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 font-mono text-xs font-medium cursor-pointer hover:bg-blue-500/30 transition-colors"
            >
              {part}
            </span>
          )
        }

        // Exception type chip
        const exceptionTypes = [
          'amount mismatch', 'timing lag', 'missing in bank',
          'missing in ledger', 'duplicate', 'fee mismatch'
        ]
        const isExceptionType = exceptionTypes.some(type =>
          part.toLowerCase() === type.toLowerCase()
        )

        if (isExceptionType) {
          const colors: Record<string, string> = {
            'amount mismatch': 'bg-orange-500/20 border-orange-500/30 text-orange-300',
            'timing lag': 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
            'missing in bank': 'bg-red-500/20 border-red-500/30 text-red-300',
            'missing in ledger': 'bg-red-500/20 border-red-500/30 text-red-300',
            'duplicate': 'bg-purple-500/20 border-purple-500/30 text-purple-300',
            'fee mismatch': 'bg-blue-500/20 border-blue-500/30 text-blue-300',
          }

          const colorClass = colors[part.toLowerCase()] || 'bg-gray-500/20 border-gray-500/30 text-gray-300'

          return (
            <span
              key={i}
              className={`inline-flex items-center px-2 py-0.5 mx-1 rounded-md border text-xs font-medium ${colorClass}`}
            >
              {part}
            </span>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

interface ToolCallChipProps {
  call: ToolCall
  index: number
  shouldReduceMotion: boolean
}

function ToolCallChip({ call, index, shouldReduceMotion }: ToolCallChipProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[call.name] || Database

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.2,
        delay: shouldReduceMotion ? 0 : index * 0.1,
      }}
      className="group relative"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-xs"
      >
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="w-3.5 h-3.5 text-emerald-400" />
        </motion.div>
        <span className="font-mono text-emerald-400">{call.name}</span>
        {Object.keys(call.args).length > 0 && (
          <span className="text-gray-500">({Object.keys(call.args).length})</span>
        )}
        <motion.div
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 p-3 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-10 min-w-[200px]"
          >
            <div className="text-xs text-gray-400 mb-2">Arguments:</div>
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
              {Object.keys(call.args).length > 0
                ? JSON.stringify(call.args, null, 2)
                : 'None'}
            </pre>
            <div className="text-xs text-gray-400 mt-3 mb-2">Result:</div>
            <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {JSON.stringify(call.result, null, 2).substring(0, 200)}
              {JSON.stringify(call.result).length > 200 ? '...' : ''}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TypingIndicator() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-blue-400" />
      </div>
      <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-1.5">
          {shouldReduceMotion ? (
            <span className="text-sm text-gray-400">Thinking...</span>
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
