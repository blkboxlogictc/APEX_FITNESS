'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Send,
  Zap,
  Dumbbell,
  Apple,
  TrendingUp,
  HelpCircle,
  Check,
  Sparkles,
  ChevronRight,
  Loader2,
  Camera,
  X,
} from 'lucide-react'
import type { ChatMessage } from '@/types/plans'
import { processImageForVision } from '@/lib/vision/imageUtils'

const QUICK_PROMPTS = [
  { icon: Dumbbell, text: 'Build my plan' },
  { icon: Apple, text: 'Adjust my nutrition plan' },
  { icon: TrendingUp, text: 'Modify my workout split' },
  { icon: HelpCircle, text: 'I have pain in...' },
]

interface PlanUpdateBadgeInfo {
  planType: 'nutrition' | 'fitness' | 'both'
  changeSummary: string
  editId: string
}

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  planUpdate?: PlanUpdateBadgeInfo
  has_plan_edit?: boolean
  created_at: string
}

function CoachPageInner() {
  const searchParams = useSearchParams()
  const prefill = searchParams.get('prefill') ?? ''

  const [supabase] = useState(() => createClient())
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState(prefill)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [pendingPlanUpdate, setPendingPlanUpdate] = useState<PlanUpdateBadgeInfo | null>(null)
  const [hasPlans, setHasPlans] = useState<boolean | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateSuccess, setGenerateSuccess] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; dataURL: string } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Check if plans exist
    const [nRes, fRes, msgRes] = await Promise.all([
      supabase
        .from('nutrition_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('fitness_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('chat_messages')
        .select('id, role, content, has_plan_edit, plan_edit_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50),
    ])

    setHasPlans(!!(nRes.data || fRes.data))

    // Load chat history
    const historyMsgs: LocalMessage[] = (msgRes.data ?? []).map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      has_plan_edit: m.has_plan_edit,
      created_at: m.created_at,
    }))

    // Fetch plan edit summaries for messages that have them
    const editIds = historyMsgs
      .filter((m) => m.has_plan_edit && msgRes.data?.find((r) => r.id === m.id)?.plan_edit_id)
      .map((m) => msgRes.data?.find((r) => r.id === m.id)?.plan_edit_id)
      .filter(Boolean) as string[]

    if (editIds.length > 0) {
      const { data: edits } = await supabase
        .from('plan_edit_history')
        .select('id, plan_type, diff_summary')
        .in('id', editIds)

      if (edits) {
        const editMap = new Map(edits.map((e) => [e.id, e]))
        historyMsgs.forEach((msg) => {
          const rawMsg = msgRes.data?.find((r) => r.id === msg.id)
          if (rawMsg?.plan_edit_id) {
            const edit = editMap.get(rawMsg.plan_edit_id)
            if (edit) {
              msg.planUpdate = {
                planType: edit.plan_type as 'nutrition' | 'fitness' | 'both',
                changeSummary: edit.diff_summary ?? '',
                editId: edit.id,
              }
            }
          }
        })
      }
    }

    setMessages(historyMsgs)
    setHistoryLoaded(true)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGeneratePlans = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/plans/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setHasPlans(true)
        setGenerateSuccess(true)
        setTimeout(() => setGenerateSuccess(false), 3000)
      }
    } catch {
      // fail silently
    } finally {
      setIsGenerating(false)
    }
  }

  const attachImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const processed = await processImageForVision(file)
      const dataURL = URL.createObjectURL(file)
      setAttachedImage({ base64: processed.base64, mimeType: processed.mimeType, dataURL })
    }
    input.click()
  }

  const sendMessage = async () => {
    const text = input.trim()
    const hasImage = !!attachedImage
    if (!text && !hasImage || isStreaming) return

    setInput('')
    const img = attachedImage
    setAttachedImage(null)

    // Optimistic user message
    const userMsg: LocalMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: text || '📷 [Image attached]',
      pending: true,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingText('')
    setPendingPlanUpdate(null)

    // Build conversation history (last 10 messages for context)
    const recentHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      let response: Response
      if (img) {
        const fd = new FormData()
        if (text) fd.append('message', text)
        fd.append('base64', img.base64)
        fd.append('mimeType', img.mimeType)
        fd.append('history', JSON.stringify(recentHistory))
        response = await fetch('/api/coach/vision-chat', { method: 'POST', body: fd })
      } else {
        response = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, conversationHistory: recentHistory }),
        })
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedText = ''
      let localPlanUpdate: PlanUpdateBadgeInfo | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const data = JSON.parse(part.slice(6)) as {
              type: string
              content?: string
              planType?: string
              changeSummary?: string
              editId?: string
              message?: string
            }

            if (data.type === 'token' && data.content) {
              accumulatedText += data.content
              setStreamingText(accumulatedText)
            } else if (data.type === 'plan_updated') {
              localPlanUpdate = {
                planType: data.planType as 'nutrition' | 'fitness' | 'both',
                changeSummary: data.changeSummary ?? '',
                editId: data.editId ?? '',
              }
              setPendingPlanUpdate(localPlanUpdate)
              // Refresh plan check
              setHasPlans(true)
            } else if (data.type === 'done') {
              // Finalize
              const aiMsg: LocalMessage = {
                id: `ai_${Date.now()}`,
                role: 'assistant',
                content: accumulatedText,
                planUpdate: localPlanUpdate ?? undefined,
                has_plan_edit: !!localPlanUpdate,
                created_at: new Date().toISOString(),
              }
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== userMsg.id),
                { ...userMsg, pending: false },
                aiMsg,
              ])
              setStreamingText('')
              setIsStreaming(false)
              setPendingPlanUpdate(null)
            } else if (data.type === 'error') {
              throw new Error(data.message ?? 'Error from server')
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      const errMsg: LocalMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong. Please try again.`,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        { ...userMsg, pending: false },
        errMsg,
      ])
      setStreamingText('')
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const planHref = (type: string) => {
    if (type === 'fitness') return '/train'
    if (type === 'nutrition') return '/nutrition'
    return '/home'
  }

  // Loading
  if (!historyLoaded) {
    return (
      <div className="flex flex-col h-screen bg-[#0A0A0F] max-w-[430px] mx-auto items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
      </div>
    )
  }

  // No plans CTA
  if (hasPlans === false && messages.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-[#0A0A0F] max-w-[430px] mx-auto">
        <div className="flex-none px-5 pt-14 pb-4 border-b border-[#1E1E2E]">
          <CoachHeader />
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
            >
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold font-space-grotesk text-[#F0F0FF] mb-2">
              First, let&apos;s build your plan
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-6 max-w-xs mx-auto">
              Generate your personalized fitness and nutrition plans. Then your coach can refine them through conversation.
            </p>
            {generateSuccess ? (
              <div className="flex items-center justify-center gap-2 text-[#00D4AA]">
                <Check size={18} />
                <span className="text-sm font-medium">Plans generated! Start chatting below.</span>
              </div>
            ) : (
              <button
                onClick={handleGeneratePlans}
                disabled={isGenerating}
                className="px-6 py-3.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Generate My Plans
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <InputBar
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          onInputChange={handleInputChange}
          textareaRef={textareaRef}
          showQuickPrompts
          onQuickPrompt={(t) => setInput(t)}
          attachedImage={attachedImage}
          onAttachImage={attachImage}
          onRemoveImage={() => setAttachedImage(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0F] max-w-[430px] mx-auto">
      {/* Header */}
      <div className="flex-none px-5 pt-14 pb-4 border-b border-[#1E1E2E]">
        <CoachHeader />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome (only if no history) */}
        {messages.length === 0 && !isStreaming && (
          <WelcomeMessage />
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} planHref={planHref} />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="flex gap-2.5">
            <AvatarDot />
            <div className="flex-1 max-w-[85%]">
              <div
                className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl rounded-tl-md px-3.5 py-3"
                style={{ borderLeft: '2px solid #6C63FF' }}
              >
                <p className="text-[#F0F0FF] text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-0.5 h-3.5 bg-[#6C63FF] ml-0.5 animate-pulse" />
                </p>
              </div>
              {pendingPlanUpdate && (
                <PlanUpdateBadge info={pendingPlanUpdate} planHref={planHref} />
              )}
            </div>
          </div>
        )}

        {/* Thinking dots */}
        {isStreaming && !streamingText && (
          <div className="flex gap-2.5">
            <AvatarDot />
            <div className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl rounded-tl-md px-4 py-3.5">
              <div className="flex items-center gap-1.5">
                {[0, 120, 240].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick prompts (only when idle + no messages) */}
        {messages.length === 0 && !isStreaming && (
          <div className="mt-4">
            <p className="text-xs text-[#6B7280] text-center mb-3">Try asking...</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => setInput(text)}
                  className="flex items-center gap-2 p-3 bg-[#13131A] border border-[#1E1E2E] rounded-xl text-left hover:border-[#6C63FF]/50 transition-all duration-200 active:scale-[0.97]"
                >
                  <Icon size={14} className="text-[#6C63FF] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280] leading-tight">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputBar
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        onSend={sendMessage}
        onKeyDown={handleKeyDown}
        onInputChange={handleInputChange}
        textareaRef={textareaRef}
        attachedImage={attachedImage}
        onAttachImage={attachImage}
        onRemoveImage={() => setAttachedImage(null)}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoachHeader() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
      >
        <Zap size={18} className="text-white" fill="white" />
      </div>
      <div>
        <h1 className="text-base font-bold font-space-grotesk text-[#F0F0FF]">APEX Coach</h1>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA]" />
          <p className="text-xs text-[#6B7280]">AI-powered · Updates your plans in real time</p>
        </div>
      </div>
    </div>
  )
}

function AvatarDot() {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
    >
      <Zap size={13} className="text-white" fill="white" />
    </div>
  )
}

function WelcomeMessage() {
  return (
    <div className="flex gap-2.5">
      <AvatarDot />
      <div className="flex-1 max-w-[85%]">
        <div
          className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl rounded-tl-md px-3.5 py-3"
          style={{ borderLeft: '2px solid #6C63FF' }}
        >
          <p className="text-[#F0F0FF] text-sm leading-relaxed">
            Hey! I&apos;m your APEX coach. I&apos;ve studied your profile, goals, and current plans.
          </p>
          <p className="text-[#F0F0FF] text-sm leading-relaxed mt-2">
            Ask me to adjust your workouts or nutrition, answer questions about training, or just tell me how you&apos;re feeling. I&apos;ll update your plans on the spot.
          </p>
        </div>
        <p className="text-[10px] text-[#6B7280] mt-1.5 ml-1">APEX Coach</p>
      </div>
    </div>
  )
}

function PlanUpdateBadge({
  info,
  planHref,
}: {
  info: PlanUpdateBadgeInfo
  planHref: (type: string) => string
}) {
  return (
    <Link href={planHref(info.planType)}>
      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00D4AA]/10 border border-[#00D4AA]/25 hover:border-[#00D4AA]/50 transition-colors cursor-pointer">
        <div className="w-4 h-4 rounded-full bg-[#00D4AA]/20 flex items-center justify-center flex-shrink-0">
          <Check size={10} className="text-[#00D4AA]" />
        </div>
        <span className="text-xs text-[#00D4AA] font-medium leading-tight">{info.changeSummary || 'Plan updated'}</span>
        <ChevronRight size={12} className="text-[#00D4AA]/60 flex-shrink-0" />
      </div>
    </Link>
  )
}

function MessageBubble({
  message,
  planHref,
}: {
  message: LocalMessage
  planHref: (type: string) => string
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div
            className="px-3.5 py-3 rounded-2xl rounded-tr-md text-sm text-white leading-relaxed"
            style={{
              background: 'linear-gradient(135deg, #6C63FF, #00D4AA)',
              opacity: message.pending ? 0.7 : 1,
            }}
          >
            {message.content}
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1 text-right mr-1">
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <AvatarDot />
      <div className="flex-1 max-w-[85%]">
        <div
          className="bg-[#13131A] border border-[#1E1E2E] rounded-2xl rounded-tl-md px-3.5 py-3"
          style={{ borderLeft: '2px solid #6C63FF' }}
        >
          <p className="text-[#F0F0FF] text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        {message.planUpdate && (
          <PlanUpdateBadge info={message.planUpdate} planHref={planHref} />
        )}
        <p className="text-[10px] text-[#6B7280] mt-1.5 ml-1">
          APEX Coach ·{' '}
          {new Date(message.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

function InputBar({
  input,
  setInput,
  isStreaming,
  onSend,
  onKeyDown,
  onInputChange,
  textareaRef,
  showQuickPrompts,
  onQuickPrompt,
  attachedImage,
  onAttachImage,
  onRemoveImage,
}: {
  input: string
  setInput: (v: string) => void
  isStreaming: boolean
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
  showQuickPrompts?: boolean
  onQuickPrompt?: (text: string) => void
  attachedImage?: { dataURL: string } | null
  onAttachImage?: () => void
  onRemoveImage?: () => void
}) {
  const canSend = (input.trim() || !!attachedImage) && !isStreaming
  return (
    <div className="flex-none px-4 pb-8 pt-3 border-t border-[#1E1E2E] bg-[#0A0A0F]">
      {showQuickPrompts && onQuickPrompt && (
        <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PROMPTS.map(({ text }) => (
            <button
              key={text}
              onClick={() => onQuickPrompt(text)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#13131A] border border-[#1E1E2E] text-xs text-[#6B7280] hover:border-[#6C63FF]/50 hover:text-[#F0F0FF] transition-all"
            >
              {text}
            </button>
          ))}
        </div>
      )}
      {attachedImage && (
        <div className="relative mb-2 w-16 h-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachedImage.dataURL} alt="Attached" className="w-16 h-16 rounded-xl object-cover" />
          <button onClick={onRemoveImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <X size={10} className="text-white" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {onAttachImage && (
          <button onClick={onAttachImage}
            className="w-10 h-10 rounded-xl bg-[#13131A] border border-[#1E1E2E] flex items-center justify-center flex-shrink-0 text-[#6B7280] hover:text-[#6C63FF] transition-colors">
            <Camera size={18} />
          </button>
        )}
        <div className="flex-1 bg-[#13131A] border border-[#1E1E2E] rounded-2xl px-4 py-3 focus-within:border-[#6C63FF] transition-colors duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask your coach anything..."
            className="w-full bg-transparent text-[#F0F0FF] text-sm placeholder-[#6B7280] focus:outline-none resize-none leading-relaxed"
            style={{ maxHeight: 120 }}
          />
        </div>
        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all duration-200 active:scale-[0.95]"
          style={{
            background: canSend ? 'linear-gradient(135deg, #6C63FF, #00D4AA)' : '#13131A',
          }}
        >
          {isStreaming ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-pulse" />
          ) : (
            <Send size={17} className={input.trim() ? 'text-white' : 'text-[#6B7280]'} />
          )}
        </button>
      </div>
      <p className="text-[10px] text-[#6B7280] text-center mt-2">
        Edits to your plan happen automatically in real time
      </p>
    </div>
  )
}

// Wrap in Suspense because of useSearchParams
export default function CoachPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#0A0A0F]">
          <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
        </div>
      }
    >
      <CoachPageInner />
    </Suspense>
  )
}
