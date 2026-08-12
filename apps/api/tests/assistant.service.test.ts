import { describe, expect, it } from 'vitest'
import { buildSupervisedAssistantRequest } from '../src/modules/assistant/assistant.service.js'

describe('supervised assistant request', () => {
  it('is stateless, bounded, and cannot call tools', () => {
    const request = buildSupervisedAssistantRequest({
      focus: 'RATEBOOK',
      question: 'Qué evidencia debo revisar antes de publicar una nueva versión?',
    })

    expect(request.store).toBe(false)
    expect(request.max_output_tokens).toBe(700)
    expect(request).not.toHaveProperty('tools')
    expect(request.instructions).toContain('Nunca afirmes que una tarifa')
    expect(request.instructions).toContain('Revisión humana requerida')
    expect(request.input[0].content).toContain('evidencia')
  })

  it('keeps the selected product focus in the server-side instructions', () => {
    const request = buildSupervisedAssistantRequest({ focus: 'RATEWARE', question: 'Qué debo revisar antes de entregar un RateBook?' })
    expect(request.metadata.focus).toBe('rateware')
    expect(request.instructions).toContain('integración controlada con Rateware')
  })
})
