export function createSpaListener(onNavigate: () => void) {
  if (
    typeof window === 'undefined' ||
    typeof history === 'undefined'
  ) {
    return { destroy: () => {} };
  }

  const originalPushState = history.pushState.bind(history);

  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    onNavigate();
  };

  const originalReplaceState = history.replaceState.bind(history);

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    onNavigate();
  };

  function onPopState() {
    onNavigate();
  }

  window.addEventListener('popstate', onPopState);

  function destroy() {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', onPopState);
  }

  return { destroy };
}
