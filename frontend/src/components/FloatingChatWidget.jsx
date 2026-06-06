/**
 * FloatingChatWidget — Phase 5
 *
 * Global floating chat button (bottom-right, all pages).
 * Opens a compact slide-in chat panel with full HRBot functionality.
 * Voice input, prompt chips, formatted responses.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import api from '@services/api'

// ── Markdown-lite formatter (same as ChatbotPage) ─────────────────────────────
function formatMessage(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    const boldified = line.split(/\*\*(.+?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <span style={{ color: 'hsl(239,84%,67%)', flexShrink: 0 }}>•</span>
          <span>{boldified}</span>
        </div>
      )
    }
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />
    return <div key={i}>{boldified}</div>
  })
}

const QUICK_CHIPS = [
  { label: '🏆 Top candidates', text: 'Show me the top candidates' },
  { label: '👥 Employee stats', text: 'Give me an employee overview' },
  { label: '🏢 Departments',    text: 'List all departments' },
]

export default function FloatingChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState([{
    id: 'init', role: 'assistant',
    content: "👋 Hi! I'm **HRBot**. Ask me anything about employees, candidates, payroll, or departments!",
  }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  const [unread,    setUnread]    = useState(0)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const recognRef = useRef(null)

  useEffect(() => {
    setHasSpeech(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    try {
      const hist = next.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/api/v1/chatbot/message', {
        message: msg,
        history: hist.slice(0, -1),
      })
      const aiMsg = { id: `a-${Date.now()}`, role: 'assistant', content: res.data.response }
      setMessages(prev => [...prev, aiMsg])
      if (!open) setUnread(u => u + 1)
    } catch (err) {
      const errText = err.response?.status === 429
        ? 'Too many messages. Wait a moment.'
        : 'Unable to connect. Please try again.'
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: `⚠️ ${errText}` }])
    }
    setLoading(false)
  }, [input, messages, loading, open])

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    r.onstart = () => setListening(true)
    r.onend   = () => setListening(false)
    r.onerror = () => setListening(false)
    r.onresult = (e) => {
      const t = e.results[0][0].transcript
      setInput(t)
      setTimeout(() => send(t), 100)
    }
    r.start()
    recognRef.current = r
  }

  const panelW = 360
  const panelH = 500

  return (
    <>
      {/* ── Slide-in panel ── */}
      <div
        id="floating-chat-panel"
        style={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          width: panelW,
          height: panelH,
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9998,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '0.875rem 1rem',
          background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>HRBot</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
              {loading ? '⏳ Thinking…' : '🟢 Online'}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 8, padding: '4px 8px',
              color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >✕</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0.75rem',
          display: 'flex', flexDirection: 'column',
        }}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id || i} style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 8,
              }}>
                {!isUser && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', marginRight: 6, alignSelf: 'flex-end',
                  }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))'
                    : 'var(--clr-surface-2)',
                  color: isUser ? '#fff' : 'var(--clr-text-1)',
                  fontSize: '0.8rem', lineHeight: 1.5,
                  border: isUser ? 'none' : '1px solid var(--clr-border)',
                  wordBreak: 'break-word',
                }}>
                  {formatMessage(msg.content)}
                </div>
              </div>
            )
          })}

          {/* Typing dots */}
          {loading && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', flexShrink: 0,
              }}>🤖</div>
              <div style={{
                padding: '0.5rem 0.75rem',
                background: 'var(--clr-surface-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: '14px 14px 14px 4px',
                display: 'flex', gap: 4,
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'hsl(239,84%,67%)',
                    animation: `bounce 1.4s infinite ${i*0.2}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        <div style={{
          padding: '0.5rem 0.75rem 0',
          display: 'flex', gap: 6, flexWrap: 'wrap',
          borderTop: '1px solid var(--clr-border)',
        }}>
          {QUICK_CHIPS.map(c => (
            <button
              key={c.text}
              onClick={() => send(c.text)}
              disabled={loading}
              style={{
                padding: '3px 9px', borderRadius: 20,
                border: '1px solid var(--clr-border)',
                background: 'var(--clr-surface)',
                color: 'var(--clr-text-3)',
                fontSize: '0.7rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >{c.label}</button>
          ))}
        </div>

        {/* Input row */}
        <div style={{
          padding: '0.5rem 0.75rem 0.75rem',
          display: 'flex', gap: 6,
        }}>
          <input
            ref={inputRef}
            style={{
              flex: 1, padding: '0.5rem 0.75rem',
              background: 'var(--clr-surface-2)',
              border: '1px solid var(--clr-border)',
              borderRadius: 10, color: 'var(--clr-text-1)',
              fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit',
            }}
            placeholder={listening ? '🎙 Listening…' : 'Ask HRBot…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={loading || listening}
          />

          {hasSpeech && (
            <button
              onClick={listening ? () => { recognRef.current?.stop(); setListening(false) } : startVoice}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: `1px solid ${listening ? 'hsl(0,72%,60%)' : 'var(--clr-border)'}`,
                background: listening ? 'hsl(0,72%,60%,0.1)' : 'var(--clr-surface-2)',
                color: listening ? 'hsl(0,72%,60%)' : 'var(--clr-text-2)',
                cursor: 'pointer', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >{listening ? '⏹' : '🎙'}</button>
          )}

          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              height: 34, padding: '0 0.75rem', borderRadius: 8,
              border: 'none',
              background: loading || !input.trim()
                ? 'var(--clr-surface-2)'
                : 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
              color: loading || !input.trim() ? 'var(--clr-text-3)' : '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {loading ? '…' : '→'}
          </button>
        </div>
      </div>

      {/* ── FAB button ── */}
      <button
        id="floating-chat-btn"
        onClick={() => setOpen(o => !o)}
        title="Open HRBot chat"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
          color: '#fff',
          fontSize: '1.4rem',
          cursor: 'pointer',
          boxShadow: '0 6px 24px hsl(239,84%,67%,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = open ? 'rotate(45deg) scale(1.1)' : 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 8px 28px hsl(239,84%,67%,0.65)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = open ? 'rotate(45deg) scale(1.05)' : 'scale(1)'
          e.currentTarget.style.boxShadow = '0 6px 24px hsl(239,84%,67%,0.5)'
        }}
      >
        {open ? '✕' : '🤖'}

        {/* Unread badge */}
        {unread > 0 && !open && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: 'hsl(0,72%,60%)',
            color: '#fff', fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--clr-bg)',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>
    </>
  )
}
