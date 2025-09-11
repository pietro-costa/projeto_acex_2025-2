export function getUserId() {
  try {
    const r = typeof window !== 'undefined' ? window.localStorage.getItem('id_usuario') : null;
    return r ? Number(r) : null;
  } catch {
    return null;
  }
}
export function setUserId(id: number) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem('id_usuario', String(id)); } catch {}
}