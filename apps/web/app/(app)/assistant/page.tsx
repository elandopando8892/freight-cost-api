import type { Metadata } from 'next'
import { SupervisedAssistant } from './supervised-assistant'

export const metadata: Metadata = { title: 'Asistente supervisado' }

export default function AssistantPage() {
  return <main className="mx-auto w-full max-w-5xl px-4 py-8"><SupervisedAssistant /></main>
}
