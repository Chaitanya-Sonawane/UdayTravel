'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { parseSentence, ParseResult } from '@/lib/parse'
import {
  StockType,
  StockItem,
  saveStock,
  adjustItemQty,
  undoLastEntry,
  updateTypeCode,
  subscribeToStockTypes,
  subscribeToStockItems,
} from '@/lib/stock'

// Extended interface for Web Speech API
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any
  webkitSpeechRecognition?: any
}

export default function StockDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()

  // Types & Items state (real-time)
  const [types, setTypes] = useState<StockType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null) // null means "All stock"
  const [items, setItems] = useState<StockItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Voice & Text Input state
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Review Card state
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewType, setReviewType] = useState('')
  const [reviewColour, setReviewColour] = useState('')
  const [reviewSize, setReviewSize] = useState('')
  const [reviewQty, setReviewQty] = useState<number | ''>(1)
  const [validationErrors, setValidationErrors] = useState<{
    type?: string
    size?: string
    qty?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)

  // Banner / Feedback Messages
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Editing type code state
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [codeEditValue, setCodeEditValue] = useState('')
  const [codeEditError, setCodeEditError] = useState<string | null>(null)
  const [codeEditLoading, setCodeEditLoading] = useState(false)

  // Undo loading state
  const [undoLoading, setUndoLoading] = useState(false)

  // Transition for smooth UI updates
  const [, startTransition] = useTransition()

  // 1. Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  // 2. Real-time listener for Types collection
  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToStockTypes(
      (loadedTypes) => {
        setTypes(loadedTypes)
        setTypesLoading(false)
      },
      (err) => {
        console.error('Types listener error:', err)
        setTypesLoading(false)
      }
    )
    return () => unsubscribe()
  }, [user])

  // 3. Real-time listener for selected Type's Items
  useEffect(() => {
    if (!user || !selectedTypeKey) {
      setItems([])
      return
    }
    setItemsLoading(true)
    const unsubscribe = subscribeToStockItems(
      selectedTypeKey,
      (loadedItems) => {
        setItems(loadedItems)
        setItemsLoading(false)
      },
      (err) => {
        console.error('Items listener error:', err)
        setItemsLoading(false)
      }
    )
    return () => unsubscribe()
  }, [user, selectedTypeKey])

  // Current selected type object
  const currentType = types.find((t) => t.id === selectedTypeKey) || null
  const totalStockCount = types.reduce((acc, t) => acc + (t.total || 0), 0)

  // 4. Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return
    const win = window as unknown as IWindowSpeechRecognition
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechRec) {
      return
    }

    const recognition = new SpeechRec()
    recognition.lang = 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
      setSpeechError(null)
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }

      const spoken = final || interim
      if (spoken) {
        setInputText(spoken)
      }

      if (final) {
        handleTriggerParse(final)
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError(
          'Microphone permission blocked. Please enable mic access, type your stock sentence above, or use Google Chrome.'
        )
      } else if (event.error !== 'no-speech') {
        setSpeechError(
          'Voice input issue detected. Please type your stock sentence or try again.'
        )
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.abort()
      } catch {
        // ignore
      }
    }
  }, [types, currentType])

  // Toggle voice recognition
  const toggleListening = () => {
    setSpeechError(null)
    const win = window as unknown as IWindowSpeechRecognition
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechRec) {
      setSpeechError(
        'Voice input is not supported in this browser. Please type the sentence above or use Google Chrome.'
      )
      return
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
    } else {
      try {
        recognitionRef.current?.start()
      } catch (err) {
        console.error('Error starting recognition:', err)
        try {
          recognitionRef.current?.abort()
          recognitionRef.current?.start()
        } catch {
          setSpeechError('Could not start microphone. Please type your sentence.')
        }
      }
    }
  }

  // Parse sentence into Review Card
  const handleTriggerParse = (textToParse: string) => {
    if (!textToParse.trim()) return

    const parsed: ParseResult = parseSentence(textToParse, {
      existingTypes: types.map((t) => t.name),
      selectedType: currentType ? currentType.name : undefined,
    })

    startTransition(() => {
      setReviewType(parsed.type || '')
      setReviewColour(parsed.colour || '')
      setReviewSize(parsed.size || '')
      setReviewQty(parsed.qty > 0 ? parsed.qty : 1)
      setValidationErrors({})
      setReviewOpen(true)
    })
  }

  // Handle "Read" button click
  const handleReadClick = () => {
    if (!inputText.trim()) {
      inputRef.current?.focus()
      return
    }
    handleTriggerParse(inputText)
  }

  // Validate review fields
  const validateReview = (): boolean => {
    const errors: { type?: string; size?: string; qty?: string } = {}
    if (!reviewType.trim()) {
      errors.type = 'Type is required'
    }
    if (!reviewSize.trim()) {
      errors.size = 'Size is required'
    }
    if (typeof reviewQty !== 'number' || reviewQty <= 0 || !Number.isInteger(reviewQty)) {
      errors.qty = 'Count must be a whole number greater than 0'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save stock
  const handleSaveStock = async () => {
    if (!validateReview() || !user) return

    try {
      setIsSaving(true)
      const existingCodes = types.map((t) => t.code)

      const result = await saveStock({
        type: reviewType,
        colour: reviewColour,
        size: reviewSize,
        qty: Number(reviewQty),
        userId: user.uid,
        existingTypeCodes: existingCodes,
      })

      // Select newly saved type so owner immediately sees it
      setSelectedTypeKey(result.typeKey)

      // Typographic polish: proper apostrophes and the × and → symbols
      const colourText = result.colour ? `${result.colour} · ` : ''
      const successMsg = `Saved: ${result.qty} × ${result.typeName} · ${colourText}${result.size} → code ${result.itemCode}`

      setFeedback({ type: 'success', message: successMsg })
      setReviewOpen(false)
      setInputText('')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    } catch (err: unknown) {
      console.error('Error saving stock:', err)
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save stock.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel review card
  const handleCancelReview = () => {
    setReviewOpen(false)
    setValidationErrors({})
    inputRef.current?.focus()
  }

  // Handle Enter key inside review card
  const handleReviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveStock()
    }
  }

  // +/- Count adjustments
  const handleQtyAdjust = async (itemKey: string, delta: number) => {
    if (!selectedTypeKey) return
    try {
      await adjustItemQty(selectedTypeKey, itemKey, delta)
    } catch (err: unknown) {
      console.error('Error adjusting quantity:', err)
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not adjust count.',
      })
    }
  }

  // Undo last save
  const handleUndo = async () => {
    try {
      setUndoLoading(true)
      const res = await undoLastEntry()
      if (res.success) {
        setFeedback({ type: 'info', message: res.message })
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err: unknown) {
      console.error('Error in undo:', err)
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Undo failed.',
      })
    } finally {
      setUndoLoading(false)
    }
  }

  // Type code editing
  const handleStartEditCode = () => {
    if (!currentType) return
    setCodeEditValue(currentType.code)
    setCodeEditError(null)
    setIsEditingCode(true)
  }

  const handleSaveTypeCode = async () => {
    if (!currentType) return
    const clean = codeEditValue.trim().toUpperCase()
    if (!clean) {
      setCodeEditError('Code cannot be empty.')
      return
    }
    if (!/^[A-Z0-9]+$/.test(clean)) {
      setCodeEditError('Uppercase letters and digits only.')
      return
    }

    try {
      setCodeEditLoading(true)
      await updateTypeCode(currentType.id, clean, types)
      setIsEditingCode(false)
      setFeedback({
        type: 'success',
        message: `Type code updated to ${clean}. Item codes regenerated.`,
      })
    } catch (err: unknown) {
      setCodeEditError(err instanceof Error ? err.message : 'Failed to update code.')
    } finally {
      setCodeEditLoading(false)
    }
  }

  // Group items for colour chips and size chart
  const colourTotals: Record<string, number> = {}
  const sizeTotals: Record<string, number> = {}

  items.forEach((item) => {
    const colName = item.colour || 'No Colour'
    colourTotals[colName] = (colourTotals[colName] || 0) + item.qty

    const sz = item.size || 'Unspecified'
    sizeTotals[sz] = (sizeTotals[sz] || 0) + item.qty
  })

  // Loading screen during auth check
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading United 18 Stock…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors font-sans">
      {/* ──────────────── LEFT SIDEBAR (Desktop) / TOP HORIZONTAL SCROLLBAR (Mobile) ──────────────── */}
      <aside className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border bg-card/60 backdrop-blur-sm p-4 flex flex-col md:min-h-screen">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 md:pb-5 border-b border-border/80 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground text-background font-black text-sm tracking-tighter">
              U18
            </span>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none">
                United 18
              </h1>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Stock Manager
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log out"
            className="text-xs font-medium text-muted-foreground hover:text-foreground p-1.5 rounded-lg border border-border/60 hover:bg-muted transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {/* Sidebar Title */}
        <div className="hidden md:flex items-center justify-between px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Categories</span>
          <span>{types.length}</span>
        </div>

        {/* Categories List / Mobile horizontal scroll */}
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar py-1">
          {/* "All Stock" Button */}
          <button
            onClick={() => setSelectedTypeKey(null)}
            className={`shrink-0 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer min-h-[44px] ${
              selectedTypeKey === null
                ? 'bg-foreground text-background shadow-sm font-semibold'
                : 'bg-muted/50 hover:bg-muted text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>All stock</span>
            </span>
            <span
              className={`ml-3 px-2 py-0.5 rounded-full text-xs font-semibold ${
                selectedTypeKey === null
                  ? 'bg-background/20 text-background'
                  : 'bg-background/80 text-foreground border border-border/60'
              }`}
            >
              {totalStockCount}
            </span>
          </button>

          {/* Types Buttons */}
          {typesLoading ? (
            <div className="text-xs text-muted-foreground py-2 px-3">
              Loading types…
            </div>
          ) : types.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 px-2 text-center">
              No types added yet. Speak or type above to add!
            </div>
          ) : (
            types.map((type) => {
              const isSelected = selectedTypeKey === type.id
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeKey(type.id)}
                  className={`shrink-0 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm font-semibold'
                      : 'bg-muted/50 hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="truncate text-left pr-2">{type.name}</span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isSelected
                        ? 'bg-background/20 text-background'
                        : 'bg-background/80 text-foreground border border-border/60'
                    }`}
                  >
                    {type.total}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ──────────────── MAIN CONTENT AREA ──────────────── */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Feedback / Notification Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs px-2 py-1 rounded hover:bg-foreground/10 cursor-pointer ml-3 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ──────────────── TOP CARD: MIC + TEXT INPUT + READ + UNDO ──────────────── */}
        <section className="bg-card border border-border rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Round Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Stop listening' : 'Start speaking'}
              className={`relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/30'
                  : 'bg-foreground text-background hover:opacity-90'
              }`}
            >
              {isListening ? (
                <span className="w-5 h-5 bg-white rounded-sm animate-ping" />
              ) : (
                <svg
                  className="w-6 h-6 md:w-7 md:h-7 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>

            {/* Spoken / Typed Text Box */}
            <div className="flex-1 w-full relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleReadClick()
                  }
                }}
                placeholder="Say or type: pant grey 5 size 32"
                className="w-full h-14 md:h-16 px-4 md:px-5 rounded-xl border border-input bg-background text-foreground text-base md:text-lg placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              {isListening && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-red-600 dark:text-red-400 animate-pulse bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                  Listening…
                </span>
              )}
            </div>

            {/* Read Button */}
            <button
              type="button"
              onClick={handleReadClick}
              className="w-full sm:w-auto h-14 md:h-16 px-6 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition cursor-pointer text-base shrink-0 flex items-center justify-center"
            >
              Read
            </button>
          </div>

          {/* Fallback & speech error message banner */}
          {speechError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              {speechError}
            </div>
          )}

          {/* Quick info & Undo Button */}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>
              Spoken example: <span className="font-mono">pant grey 5 size 32</span>
            </span>
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoLoading}
              className="text-xs font-semibold text-foreground/80 hover:text-foreground underline underline-offset-4 hover:no-underline disabled:opacity-50 cursor-pointer min-h-[36px] flex items-center gap-1"
            >
              {undoLoading ? 'Reversing…' : 'Undo last entry'}
            </button>
          </div>

          {/* ──────────────── REVIEW CARD (Appears after reading) ──────────────── */}
          {reviewOpen && (
            <div className="mt-4 p-5 rounded-xl border border-border bg-muted/30 shadow-inner space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">
                  Review Stock Details
                </h3>
                <span className="text-xs text-muted-foreground">
                  Press Enter or tap Save stock
                </span>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5"
                onKeyDown={handleReviewKeyDown}
              >
                {/* Type Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="type-suggestions"
                    value={reviewType}
                    onChange={(e) => {
                      setReviewType(e.target.value)
                      if (validationErrors.type) {
                        setValidationErrors((prev) => ({ ...prev, type: undefined }))
                      }
                    }}
                    placeholder="e.g. Pant"
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 ${
                      validationErrors.type
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-input focus:ring-foreground/20'
                    }`}
                  />
                  <datalist id="type-suggestions">
                    {types.map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                  </datalist>
                  {validationErrors.type && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {validationErrors.type}
                    </p>
                  )}
                </div>

                {/* Colour Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Colour
                  </label>
                  <input
                    type="text"
                    value={reviewColour}
                    onChange={(e) => setReviewColour(e.target.value)}
                    placeholder="e.g. Grey (optional)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>

                {/* Size Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewSize}
                    onChange={(e) => {
                      setReviewSize(e.target.value)
                      if (validationErrors.size) {
                        setValidationErrors((prev) => ({ ...prev, size: undefined }))
                      }
                    }}
                    placeholder="e.g. 32 or M"
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 ${
                      validationErrors.size
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-input focus:ring-foreground/20'
                    }`}
                  />
                  {validationErrors.size && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {validationErrors.size}
                    </p>
                  )}
                </div>

                {/* Count Field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={reviewQty}
                    onChange={(e) => {
                      const v = e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      setReviewQty(v)
                      if (validationErrors.qty) {
                        setValidationErrors((prev) => ({ ...prev, qty: undefined }))
                      }
                    }}
                    placeholder="Count"
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 ${
                      validationErrors.qty
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-input focus:ring-foreground/20'
                    }`}
                  />
                  {validationErrors.qty && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {validationErrors.qty}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelReview}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted text-foreground transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer min-h-[44px] flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save stock'
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ──────────────── STOCK VIEW ──────────────── */}
        {selectedTypeKey === null ? (
          /* ──────── ALL STOCK VIEW: BAR CHART OF TOTAL PER TYPE ──────── */
          <section className="bg-card border border-border rounded-2xl shadow-sm p-5 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">All Stock</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total inventory across {types.length} category{types.length === 1 ? '' : 'ies'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">{totalStockCount}</span>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Units
                </span>
              </div>
            </div>

            {/* Bar Chart: Total Count Per Type */}
            {types.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No stock entries found. Tap the mic or type to add items.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock by Category
                </h3>
                <div className="space-y-3">
                  {types.map((t) => {
                    const maxVal = Math.max(...types.map((x) => x.total), 1)
                    const pct = Math.max(4, Math.round((t.total / maxVal) * 100))
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTypeKey(t.id)}
                        className="group flex flex-col gap-1 cursor-pointer p-2 rounded-xl hover:bg-muted/40 transition"
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span className="group-hover:text-foreground font-semibold">
                            {t.name}{' '}
                            <span className="text-xs font-mono text-muted-foreground">
                              ({t.code})
                            </span>
                          </span>
                          <span className="font-bold">{t.total}</span>
                        </div>
                        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* ──────── SELECTED TYPE VIEW: TOTAL, CHIPS, SIZE CHART, TABLE ──────── */
          <section className="bg-card border border-border rounded-2xl shadow-sm p-5 md:p-6 space-y-6">
            {/* Heading with Total & Editable Type Code */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {currentType?.name || selectedTypeKey}
                  </h2>
                  {/* Type Code Badge & In-place Edit */}
                  {!isEditingCode ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/80">
                        {currentType?.code}
                      </span>
                      <button
                        onClick={handleStartEditCode}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                        title="Edit type code"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={codeEditValue}
                        onChange={(e) => setCodeEditValue(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="CODE"
                        className="w-20 px-2 py-1 text-xs font-mono font-bold uppercase rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
                      />
                      <button
                        onClick={handleSaveTypeCode}
                        disabled={codeEditLoading}
                        className="text-xs px-2.5 py-1 rounded bg-foreground text-background font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingCode(false)}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {codeEditError && (
                  <p className="text-xs text-red-500 font-medium">{codeEditError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Category details & item variants
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-3xl font-black">{currentType?.total || 0}</span>
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Items
                </span>
              </div>
            </div>

            {/* Colour Totals as Chips */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Colours
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(colourTotals).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No colours yet</span>
                ) : (
                  Object.entries(colourTotals).map(([col, cnt]) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border/80 shadow-xs"
                    >
                      <span>{col}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-foreground text-background font-bold text-[10px]">
                        {cnt}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Bar Chart: Stock by Size */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Stock by Size
              </h3>
              {Object.keys(sizeTotals).length === 0 ? (
                <p className="text-xs text-muted-foreground">No size records yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(sizeTotals).map(([sz, count]) => {
                    const maxSzVal = Math.max(...Object.values(sizeTotals), 1)
                    const pct = Math.max(8, Math.round((count / maxSzVal) * 100))
                    return (
                      <div
                        key={sz}
                        className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Size {sz}</span>
                          <span className="font-bold text-sm">{count}</span>
                        </div>
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Stock Items Table with − and + buttons */}
            <div className="space-y-3 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Stock Breakdown & Adjustments
              </h3>

              {itemsLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading items…
                </div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No items in this category yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Colour</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4 text-center">Count</th>
                        <th className="py-3 px-4 text-right">Correct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-foreground">
                            {item.code}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.colour || (
                              <span className="text-muted-foreground italic text-xs">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">{item.size}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-base">
                            {item.qty}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Minus Button (never below 0) */}
                              <button
                                type="button"
                                onClick={() => handleQtyAdjust(item.id, -1)}
                                disabled={item.qty <= 0}
                                title="Decrease count"
                                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center font-bold text-base hover:bg-muted active:scale-95 disabled:opacity-30 cursor-pointer"
                              >
                                −
                              </button>
                              {/* Plus Button */}
                              <button
                                type="button"
                                onClick={() => handleQtyAdjust(item.id, 1)}
                                title="Increase count"
                                className="w-10 h-10 rounded-lg border border-border flex items-center justify-center font-bold text-base hover:bg-muted active:scale-95 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
