import { useLocation, useNavigate } from 'react-router-dom'

// Back handler that mirrors Flutter's pop semantics on the web. Pages must
// POP history here, never push the page they "came from" — pushing (the old
// CartPage pageType branches did this) grows the history stack on every
// back tap and traps the user in a products <-> cart loop that can never
// unwind to /main. When this route is the first history entry (deep link,
// refresh), there is nothing to pop, so land on the fallback instead.
export function useAppBack(fallback = '/main') {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') navigate(fallback, { replace: true })
    else navigate(-1)
  }
}
