export type QuoteRequestTicket = { id: number; revision: number }

/** A response is eligible only while its exact draft revision and request remain active. */
export class QuoteRequestGate {
  private revision = 0
  private nextId = 0
  private active: QuoteRequestTicket | null = null

  invalidate() { this.revision++; this.active = null }
  begin(): QuoteRequestTicket | null {
    if (this.active) return null
    const ticket = { id: ++this.nextId, revision: this.revision }
    this.active = ticket
    return ticket
  }
  isCurrent(ticket: QuoteRequestTicket) {
    return this.active?.id === ticket.id && this.revision === ticket.revision
  }
  finish(ticket: QuoteRequestTicket) {
    if (this.active?.id === ticket.id) this.active = null
  }
}
