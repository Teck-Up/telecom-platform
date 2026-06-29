import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Bot, User } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000'

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA. Je peux vous aider avec vos questions sur les factures, paiements et recouvrement. Comment puis-je vous aider ?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const { data } = await axios.post(`${AI_URL}/chat`, {
        message: userMsg,
        history: messages.slice(-6)
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, je suis temporairement indisponible. Veuillez réessayer plus tard.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Assistant IA</h1>
      <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-gray-100 text-gray-800' : 'bg-blue-600 text-white'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-600"><Bot size={16} /></div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Posez votre question..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Questions suggérées: &quot;Quelle est la dernière facture ?&quot; · &quot;Combien on a facturé aujourd&apos;hui ?&quot; · &quot;Combien de clients actifs ?&quot; · &quot;Quel est le montant des impayés ?&quot;</p>
        </div>
      </div>
    </div>
  )
}
