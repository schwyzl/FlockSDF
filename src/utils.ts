export function rightNow(): number {
    return window.performance
      ? window.performance.now()
      : Date.now() || +new Date();
  }