import type { ComponentProps } from 'react'
// Standalone component fixture, not a Next route or authentication substitute.
export default function TestLink(props: ComponentProps<'a'>) { return <a {...props} /> }
