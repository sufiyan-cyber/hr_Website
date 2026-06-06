/**
 * ChatbotPage — Phase 5
 *
 * Full-page AI HR Chatbot with:
 * - Conversation history loaded from API
 * - Text input + send
 * - Voice input via Web Speech API (mic button)
 * - Example prompt chips
 * - Markdown-lite formatting (bullets, bold)
 * - Loading indicator
 * - Toast notifications
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import api from '@services/api'

// ── Markdown-lite formatter ───────────────────────────────────────────────────
function formatMessage(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold: **text**
    const boldified = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    // Bullet lines
    if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ color: 'hsl(239,84%,67%)', flexShrink: 0 }}>•</span>
          <span>{boldified}</span>
        </div>
      )
    }
    // Heading lines (##)
    if (line.startsWith('##')) {
      return <div key={i} style={{ fontWeight: 800, marginTop: 8, marginBottom: 4, fontSize: '0.95rem' }}>{boldified}</div>
    }
    // Empty line → spacing
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />
    return <div key={i}>{boldified}</div>
  })
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', marginRight: 8, alignSelf: 'flex-end',
        }}>
          🤖
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '0.75rem 1rem',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser
          ? 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))'
          : 'var(--clr-surface-2)',
        color: isUser ? '#fff' : 'var(--clr-text-1)',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid var(--clr-border)',
        boxShadow: isUser
          ? '0 4px 14px hsl(239,84%,67%,0.3)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        wordBreak: 'break-word',
      }}>
        {formatMessage(msg.content)}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--clr-surface-2)',
          border: '1px solid var(--clr-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', marginLeft: 8, alignSelf: 'flex-end',
        }}>
          👤
        </div>
      )}
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.9rem', flexShrink: 0,
      }}>
        🤖
      </div>
      <div style={{
        padding: '0.75rem 1rem',
        background: 'var(--clr-surface-2)',
        border: '1px solid var(--clr-border)',
        borderRadius: '18px 18px 18px 4px',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'hsl(239,84%,67%)',
            animation: `bounce 1.4s infinite ${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Prompt Chips ──────────────────────────────────────────────────────────────
const PROMPT_CHIPS = [
  { label: '🏆 Top candidates',             text: 'Show me the top candidates by AI score' },
  { label: '👥 Engineering team',           text: 'How many employees are in Engineering?' },
  { label: '🎉 Hired this month',           text: 'Who was hired this month?' },
  { label: '📊 Employee overview',          text: 'Give me an employee overview' },
  { label: '💰 Payroll summary',            text: 'What is the current payroll summary?' },
  { label: '🏢 Departments',               text: 'List all departments and their sizes' },
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChatbotPage() {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [histLoading,  setHistLoading]  = useState(true)
  const [listening,    setListening]    = useState(false)
  const [voiceSupport, setVoiceSupport] = useState(false)
  const [error,        setError]        = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const recognRef   = useRef(null)

  // Check voice support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setVoiceSupport(!!SpeechRecognition)
  }, [])

  // Load history
  useEffect(() => {
    const load = async () => {
      setHistLoading(true)
      try {
        const res = await api.get('/api/v1/chatbot/history')
        const msgs = res.data?.messages || []
        setMessages(msgs)
      } catch {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "👋 Hello! I'm **HRBot**, your AI HR assistant.\n\nAsk me about employees, candidates, payroll, attendance, or departments!",
        }])
      }
      setHistLoading(false)
    }
    load()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    setInput('')
    setError(null)

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const history = nextMessages.slice(-10).map(m => ({
        role: m.role, content: m.content,
      }))
      const res = await api.post('/api/v1/chatbot/message', {
        message: msg,
        history: history.slice(0, -1), // exclude the just-added user msg
      })
      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.data.response,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errMsg = err.response?.status === 429
        ? 'Rate limit reached. Please wait a moment before sending another message.'
        : err.response?.data?.detail || 'Failed to get a response. Please try again.'
      setError(errMsg)
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
      }])
    }
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [input, messages, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recog = new SpeechRecognition()
    recog.lang = 'en-US'
    recog.continuous = false
    recog.interimResults = false

    recog.onstart = () => setListening(true)
    recog.onend   = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setTimeout(() => sendMessage(transcript), 100)
    }

    recog.start()
    recognRef.current = recog
  }

  const stopVoice = () => {
    recognRef.current?.stop()
    setListening(false)
  }

  const fieldStyle = {
    padding: '0.75rem 1rem',
    background: 'var(--clr-surface-2)',
    border: '1px solid var(--clr-border)',
    borderRadius: 12,
    color: 'var(--clr-text-1)',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'inherit',
    flex: 1,
    resize: 'none',
    lineHeight: 1.5,
    transition: 'border-color 0.2s',
  }

  return (
    <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div className="dash-page__header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', boxShadow: '0 4px 14px hsl(239,84%,67%,0.3)',
          }}>
            🤖
          </div>
          <div>
            <h1 className="dash-page__title" style={{ marginBottom: 2 }}>HRBot</h1>
            <p className="dash-page__subtitle" style={{ margin: 0 }}>
              {loading ? '⏳ Thinking…' : '🟢 Online — ask me anything about HR'}
            </p>
          </div>
        </div>
        <button
          className="modal-btn modal-btn--ghost"
          onClick={() => {
            setMessages([{
              id: 'welcome-new',
              role: 'assistant',
              content: "👋 New conversation started! I'm **HRBot**. How can I help you with HR today?",
            }])
          }}
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
        >
          🗑 Clear Chat
        </button>
      </div>

      {/* ── Chat window ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        background: 'var(--clr-bg)',
        border: '1px solid var(--clr-border)',
        borderRadius: 16,
        minHeight: 0,
        maxHeight: 'calc(100vh - 340px)',
      }}>
        {histLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                <div className="skeleton-pulse" style={{ height: 48, width: '60%', borderRadius: 18 }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Prompt chips ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12,
      }}>
        {PROMPT_CHIPS.map(chip => (
          <button
            key={chip.text}
            onClick={() => sendMessage(chip.text)}
            disabled={loading}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid var(--clr-border)',
              background: 'var(--clr-surface)',
              color: 'var(--clr-text-2)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = 'hsl(239,84%,67%,0.08)'
                e.currentTarget.style.borderColor = 'hsl(239,84%,67%,0.4)'
                e.currentTarget.style.color = 'hsl(239,84%,67%)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = ''
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.color = ''
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Input row ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingTop: 4 }}>
        <textarea
          ref={inputRef}
          id="chatbot-input"
          style={fieldStyle}
          rows={2}
          placeholder={listening ? '🎙 Listening… speak now' : 'Ask HRBot anything…  (Enter to send)'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || listening}
        />

        {/* Voice button */}
        {voiceSupport && (
          <button
            id="voice-btn"
            onClick={listening ? stopVoice : startVoice}
            disabled={loading}
            title={listening ? 'Stop listening' : 'Voice input'}
            style={{
              width: 44, height: 44,
              borderRadius: 12,
              border: `2px solid ${listening ? 'hsl(0,72%,60%)' : 'var(--clr-border)'}`,
              background: listening ? 'hsl(0,72%,60%,0.12)' : 'var(--clr-surface-2)',
              color: listening ? 'hsl(0,72%,60%)' : 'var(--clr-text-2)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
              animation: listening ? 'pulse-ring 1.5s infinite' : 'none',
            }}
          >
            {listening ? '⏹' : '🎙'}
          </button>
        )}

        {/* Send button */}
        <button
          id="chatbot-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            height: 44,
            padding: '0 1.25rem',
            borderRadius: 12,
            border: 'none',
            background: loading || !input.trim()
              ? 'var(--clr-surface-2)'
              : 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            color: loading || !input.trim() ? 'var(--clr-text-3)' : '#fff',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 700,
            fontFamily: 'inherit',
            flexShrink: 0,
            transition: 'all 0.2s',
            boxShadow: loading || !input.trim()
              ? 'none'
              : '0 4px 14px hsl(239,84%,67%,0.35)',
          }}
        >
          {loading ? '⏳' : 'Send →'}
        </button>
      </div>

      <p style={{
        fontSize: '0.7rem', color: 'var(--clr-text-3)',
        textAlign: 'center', margin: '4px 0 0',
      }}>
        HRBot may produce errors. Always verify important HR data in the platform.
      </p>

    </div>
  )
}
