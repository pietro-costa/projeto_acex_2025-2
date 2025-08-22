export function getUserId(){const r=typeof window!=='undefined'?window.localStorage.getItem('id_usuario'):null;const p=r?Number(r):1;return Number.isFinite(p)&&p>0?p:1}
export function setUserId(id:number){if(typeof window!=='undefined') window.localStorage.setItem('id_usuario', String(id));}
