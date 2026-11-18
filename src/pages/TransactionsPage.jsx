import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client, { unwrap } from '../api/client';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate, formatMoney } from '../utils/format';

const EMPTY_FILTERS = { status: '', type: '', query: '', page: 0, size: 10 };

const STATUS_CHIPS = [
  { value: '', label: 'All activity' },
  { value: 'SUCCESS', label: 'Settled' },
  { value: 'PENDING', label: 'Awaiting review' },
  { value: 'HOLD', label: 'Held' }
];

function shortMoney(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value != null) params.set(key, value);
    });
    client.get(`/transactions?${params.toString()}`)
      .then((response) => active && setData(unwrap(response)))
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load history.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters]);

  function update(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value, page: 0 }));
  }

  const rows = data?.content || [];
  const settled = rows.filter((tx) => tx.status === 'SUCCESS').length;
  const held = rows.filter((tx) => tx.status === 'HOLD' || tx.status === 'PENDING').length;
  const pageAmount = rows.reduce((total, tx) => total + Number(tx.amount ?? 0), 0);
  const activeFilterCount = [filters.status, filters.type, filters.query].filter(Boolean).length;
  const totalPages = Math.max(1, Number(data?.totalPages || 1));
  const currentPage = Number(data?.number ?? filters.page) + 1;

  return (
    <>
      <section className="customer-hero flow-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="hero-kicker">Your activity</span>
            <h1 className="hero-title">Transaction history</h1>
            <p className="hero-subtitle">
              Every simulated transfer and payment you are allowed to see, with its risk decision and result.
            </p>
          </div>
          <Link to="/send" className="btn btn-light btn-sm">Send simulated money</Link>
        </div>
      </section>

      <ErrorMessage message={error} />

      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="history-stat"><span className="history-stat-label">On this page</span>
            <strong>{rows.length}</strong><span className="small text-muted">rows loaded</span></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="history-stat"><span className="history-stat-label">Settled</span>
            <strong>{settled}</strong><span className="small text-muted">SUCCESS rows</span></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="history-stat"><span className="history-stat-label">Waiting / held</span>
            <strong>{held}</strong><span className="small text-muted">needs attention</span></div>
        </div>
        <div className="col-md-3 col-6">
          <div className="history-stat"><span className="history-stat-label">Simulated value</span>
            <strong>₹{shortMoney(pageAmount)}</strong><span className="small text-muted">this page only</span></div>
        </div>
      </div>

      <div className="card history-filter-card mb-3">
        <div className="card-body">
          <div className="filter-chip-row mb-3">
            {STATUS_CHIPS.map((chip) => (
              <button key={chip.label} type="button"
                className={`filter-chip ${filters.status === chip.value ? 'active' : ''}`}
                onClick={() => update('status', chip.value)}>
                {chip.label}
              </button>
            ))}
          </div>
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <label className="form-label small text-muted" htmlFor="history-type">Type</label>
              <select id="history-type" className="form-select form-select-sm"
                value={filters.type} onChange={(e) => update('type', e.target.value)}>
                <option value="">All types</option>
                <option value="TRANSFER">Wallet transfer</option>
                <option value="PAYMENT">Simulated payment</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted" htmlFor="history-search">Search</label>
              <input id="history-search" className="form-control form-control-sm"
                placeholder="Search reference or description"
                value={filters.query} onChange={(e) => update('query', e.target.value)} />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-sm btn-outline-secondary w-100"
                disabled={activeFilterCount === 0}
                onClick={() => setFilters(EMPTY_FILTERS)}>
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <Loading /> : !rows.length ? (
            <div className="text-center py-4">
              <EmptyState label="No simulated transactions match these filters." />
              <button className="btn btn-sm btn-outline-primary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive"><table className="table table-hover align-middle history-table">
                <thead><tr>
                  <th>Reference</th><th>Type</th><th>Description</th>
                  <th>Amount</th><th>Status</th><th>Risk</th><th>Created</th>
                </tr></thead>
                <tbody>{rows.map((tx) => (
                  <tr key={tx.reference}>
                    <td><Link to={`/transactions/${tx.reference}`}>{tx.reference}</Link></td>
                    <td>
                      <span className={`type-pill ${tx.type === 'FUNDING' ? 'type-in' : 'type-out'}`}>
                        {tx.type === 'FUNDING' ? 'Added' : tx.type === 'PAYMENT' ? 'Payment' : 'Transfer'}
                      </span>
                    </td>
                    <td className="small text-muted">{tx.description || '—'}</td>
                    <td className="fw-semibold">{formatMoney(tx.amount, tx.currency)}</td>
                    <td><StatusBadge value={tx.status} /></td>
                    <td><RiskBadge level={tx.riskLevel} score={tx.riskScore} /></td>
                    <td className="small text-muted">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div className="history-pagination">
                <span className="small text-muted">
                  {data?.totalElements ?? 0} simulated transactions · page {currentPage} of {totalPages}
                </span>
                <div className="btn-group">
                  <button className="btn btn-sm btn-outline-secondary" disabled={data?.first ?? true}
                    onClick={() => setFilters((previous) => ({ ...previous, page: previous.page - 1 }))}>
                    ← Previous
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" disabled={data?.last ?? true}
                    onClick={() => setFilters((previous) => ({ ...previous, page: previous.page + 1 }))}>
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
