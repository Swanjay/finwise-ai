// Haptic feedback utility for mobile devices
// Uses the Vibration API for tactile responses

export const haptic = {
  /** Light tap — button press, toggle */
  light() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  },
  
  /** Medium tap — confirm action, save */
  medium() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25)
    }
  },
  
  /** Heavy — delete, error */
  heavy() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50])
    }
  },
  
  /** Success — achievement unlocked, save complete */
  success() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 50, 10])
    }
  },
  
  /** Warning — budget almost exceeded */
  warning() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30, 50, 30])
    }
  },
  
  /** Error — failed action */
  error() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  },
}

/**
 * Pull-to-refresh handler
 * Attaches to a scrollable container and triggers refresh when pulled down
 */
export function setupPullToRefresh(
  container: HTMLElement,
  onRefresh: () => Promise<void>,
  options?: { threshold?: number }
) {
  const threshold = options?.threshold ?? 80
  let startY = 0
  let pulling = false
  let refreshing = false

  function onTouchStart(e: TouchEvent) {
    if (container.scrollTop > 0 || refreshing) return
    startY = e.touches[0].clientY
    pulling = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling || refreshing) return
    const diff = e.touches[0].clientY - startY
    if (diff > 0 && diff < threshold * 2) {
      container.style.transform = `translateY(${Math.min(diff * 0.4, threshold)}px)`
      container.style.transition = 'none'
    }
  }

  async function onTouchEnd(e: TouchEvent) {
    if (!pulling || refreshing) return
    pulling = false
    const diff = e.changedTouches[0].clientY - startY
    
    container.style.transition = 'transform 0.3s ease'
    container.style.transform = 'translateY(0)'
    
    if (diff >= threshold) {
      refreshing = true
      haptic.medium()
      await onRefresh()
      refreshing = false
    }
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: true })
  container.addEventListener('touchend', onTouchEnd)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('touchend', onTouchEnd)
  }
}

/**
 * Swipe-to-delete handler
 * Returns the swipe amount as a percentage (0-1)
 */
export function setupSwipeToDelete(
  element: HTMLElement,
  onDelete: () => void,
  options?: { threshold?: number }
) {
  const threshold = options?.threshold ?? 0.4
  let startX = 0
  let currentX = 0
  let swiping = false

  function onTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX
    swiping = true
    element.style.transition = 'none'
  }

  function onTouchMove(e: TouchEvent) {
    if (!swiping) return
    currentX = e.touches[0].clientX
    const diff = startX - currentX
    if (diff > 0) {
      const pct = Math.min(diff / element.offsetWidth, 1)
      element.style.transform = `translateX(-${pct * 100}%)`
      element.style.opacity = `${1 - pct * 0.5}`
    }
  }

  function onTouchEnd() {
    if (!swiping) return
    swiping = false
    const diff = startX - currentX
    const pct = diff / element.offsetWidth

    if (pct >= threshold) {
      haptic.heavy()
      element.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      element.style.transform = 'translateX(-100%)'
      element.style.opacity = '0'
      setTimeout(onDelete, 300)
    } else {
      element.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      element.style.transform = 'translateX(0)'
      element.style.opacity = '1'
    }
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true })
  element.addEventListener('touchmove', onTouchMove, { passive: true })
  element.addEventListener('touchend', onTouchEnd)

  return () => {
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    element.removeEventListener('touchend', onTouchEnd)
  }
}
