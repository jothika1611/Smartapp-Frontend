export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-danger" role="alert">{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div className="alert alert-success" role="status">{message}</div>;
}

export function Loading({ label = 'Loading simulated data…' }) {
  return <div className="text-muted py-3">{label}</div>;
}

export function EmptyState({ label = 'Nothing to show yet.' }) {
  return <div className="text-muted py-3">{label}</div>;
}
