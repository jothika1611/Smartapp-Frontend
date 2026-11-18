export function formatMoney(value, currency = 'INR') {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return `— ${currency}`;
  return `${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)} ${currency}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function riskClass(level) {
  return `risk-${String(level || 'LOW').toLowerCase()}`;
}
