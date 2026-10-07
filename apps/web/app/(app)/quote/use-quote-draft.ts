'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import type { TripFuelReview, TripFuelSelection } from '@/lib/trip-fuel-contract'
import { QuoteRequestGate } from '@/lib/quote-request-gate'
import { type CostBaseOption, type FormFields, type QuoteResult, type ReopenQuote, initialFormForQuote, quoteBody } from './quote-shared'

type ReviewedCalculation = { result: QuoteResult; form: FormFields }
type RequestState = { pending: boolean; error: unknown | null }
type SaveState = { key: string; savedId: string | null; label: string; attempted: boolean; copyRequested: boolean }

/** One capture and one reviewed result for both entry modes. */
export function useQuoteDraft(costBases: CostBaseOption[], initialQuote?: ReopenQuote) {
  const [form, setFormState] = useState<FormFields>(() => initialFormForQuote(costBases, initialQuote))
  const formRef = useRef(form)
  const gate = useRef(new QuoteRequestGate())
  const [fuelReview, setFuelReview] = useState<TripFuelReview | null>(null)
  const fuelChoice = useRef<TripFuelSelection | null>(null)
  const fuelReviewRef = useRef<TripFuelReview | null>(null)
  const [reviewed, setReviewed] = useState<ReviewedCalculation | null>(null)
  const reviewedRef = useRef<ReviewedCalculation | null>(null)
  const [saveState, setSaveState] = useState<SaveState | null>(null)
  const saveStateRef = useRef<SaveState | null>(null)
  const [requestState, setRequestState] = useState<RequestState>({ pending: false, error: null })

  useEffect(() => {
    const ownedGate = gate.current
    const expire = () => {
      ownedGate.invalidate(); fuelChoice.current = null; fuelReviewRef.current = null
      reviewedRef.current = null; saveStateRef.current = null
      setFuelReview(null); setReviewed(null); setSaveState(null)
      setRequestState({ pending: false, error: new Error('Tu sesión venció. Inicia sesión de nuevo y revisa los inputs.') })
    }
    window.addEventListener(sessionExpiredEvent, expire)
    return () => { ownedGate.invalidate(); window.removeEventListener(sessionExpiredEvent, expire) }
  }, [])

  const update = (next: FormFields | ((previous: FormFields) => FormFields)) => {
    const value = typeof next === 'function' ? next(formRef.current) : next
    if (Object.keys(value).every(key => value[key as keyof FormFields] === formRef.current[key as keyof FormFields])) return
    const effectiveChanged = JSON.stringify(quoteBody(value)) !== JSON.stringify(quoteBody(formRef.current))
    formRef.current = value
    setFormState(value)
    if (!effectiveChanged) return
    gate.current.invalidate()
    fuelChoice.current = null; fuelReviewRef.current = null; setFuelReview(null)
    setReviewed(null)
    reviewedRef.current = null
    saveStateRef.current = null
    setSaveState(null)
    setRequestState({ pending: false, error: null })
  }

  const reset = () => {
    gate.current.invalidate()
    fuelChoice.current = null; fuelReviewRef.current = null; setFuelReview(null)
    const value = initialFormForQuote(costBases, initialQuote)
    formRef.current = value
    setFormState(value)
    setReviewed(null)
    reviewedRef.current = null
    saveStateRef.current = null
    setSaveState(null)
    setRequestState({ pending: false, error: null })
  }

  const calculate = async () => {
    const ticket = gate.current.begin()
    if (!ticket) return
    const submittedForm = { ...formRef.current }
    setRequestState({ pending: true, error: null })
    try {
      if (!fuelChoice.current) {
        const inputs = await fetcher<{ fuel: TripFuelReview | null }>('/api/v1/engine/route-inputs', {
          method: 'POST', json: quoteBody(submittedForm), silent: true,
        })
        if (!gate.current.isCurrent(ticket)) return
        fuelReviewRef.current = inputs.fuel; setFuelReview(inputs.fuel)
        if (inputs.fuel) { setRequestState({ pending: false, error: null }); return }
      }
      const result = await fetcher<QuoteResult>('/api/v1/engine/quote-by-route', {
        method: 'POST', json: { ...quoteBody(submittedForm), ...(fuelChoice.current ? { tripFuel: fuelChoice.current } : {}) }, silent: true,
      })
      if (!gate.current.isCurrent(ticket)) return
      const nextReviewed = { result, form: submittedForm }
      reviewedRef.current = nextReviewed
      setReviewed(nextReviewed)
      const sourceLabel = initialQuote?.label?.trim() || initialQuote?.id?.slice(0, 8)
      const nextSave = { key: crypto.randomUUID(), savedId: null, label: sourceLabel ? `Reapertura · ${sourceLabel}` : '', attempted: false, copyRequested: false }
      saveStateRef.current = nextSave
      setSaveState(nextSave)
      setRequestState({ pending: false, error: null })
      toast.success('Cálculo listo para revisión')
    } catch (error) {
      if (!gate.current.isCurrent(ticket)) return
      if (error instanceof ClientApiError && [401,403,409].includes(error.status)) {
        fuelChoice.current = null; fuelReviewRef.current = null; setFuelReview(null)
      }
      setReviewed(null)
      reviewedRef.current = null
      saveStateRef.current = null
      setSaveState(null)
      setRequestState({ pending: false, error })
    } finally {
      gate.current.finish(ticket)
    }
  }

  const acceptFuel = (choice: TripFuelSelection) => {
    if (!fuelReviewRef.current || choice.contextHash !== fuelReviewRef.current.contextHash || requestState.pending) return
    fuelChoice.current = choice
    return calculate()
  }

  const setSaveLabel = (label: string) => {
    const current = saveStateRef.current
    if (!current || (current.attempted && (!current.savedId || current.copyRequested))) return
    const next = { ...current, label }
    saveStateRef.current = next
    setSaveState(next)
  }

  const beginSave = () => {
    const current = saveStateRef.current
    if (!current) return null
    const next = current.savedId && !current.copyRequested
      ? { ...current, key: crypto.randomUUID(), attempted: true, copyRequested: true }
      : { ...current, attempted: true }
    saveStateRef.current = next
    setSaveState(next)
    return { key: next.key, label: next.label.trim() || null, previewId: reviewedRef.current?.result.previewId }
  }

  const recordSaved = (previewId: string, id: string) => {
    if (reviewedRef.current?.result.previewId !== previewId || !saveStateRef.current) return false
    const next = { ...saveStateRef.current, savedId: id, copyRequested: false }
    saveStateRef.current = next
    setSaveState(next)
    return true
  }

  return {
    form, update, reset, reviewed, saveState, setSaveLabel, beginSave, recordSaved, fuelReview, acceptFuel,
    quote: {
      mutate: calculate,
      isPending: requestState.pending,
      isError: requestState.error !== null,
      error: requestState.error,
    },
  }
}

export type QuoteDraft = ReturnType<typeof useQuoteDraft>
