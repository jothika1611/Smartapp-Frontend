import { riskClass } from '../utils/format';

export function StatusBadge({ value }) {
  return <span className={`badge status-${String(value || '').toLowerCase()}`}>{value || '—'}</span>;
}

export function RiskBadge({ level, score }) {
  return (
    <span className={`badge ${riskClass(level)}`}>
      {level || '—'}{score != null ? ` · ${score}/100` : ''}
    </span>
  );
}
