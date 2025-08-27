export const DATA_UPDATED = "app:data-updated";

export function emitDataUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_UPDATED));
}

export function onDataUpdated(cb: () => void) {
  const h = () => cb();
  window.addEventListener(DATA_UPDATED, h);
  return () => window.removeEventListener(DATA_UPDATED, h);
}
