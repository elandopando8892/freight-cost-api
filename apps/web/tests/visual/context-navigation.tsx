import { useSyncExternalStore } from 'react'
// Synthetic fixture only. Next's History API integration is not exercised here.
const nativeReplace = window.history.replaceState.bind(window.history)
window.history.replaceState = (...args) => { nativeReplace(...args); window.dispatchEvent(new PopStateEvent('popstate')) }
export function useSearchParams() {
  const search = useSyncExternalStore(callback => {
    window.addEventListener('popstate', callback)
    return () => window.removeEventListener('popstate', callback)
  }, () => window.location.search)
  return new URLSearchParams(search)
}
