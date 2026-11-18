import { useCallback, useEffect, useState } from 'react';
import client, { unwrap } from '../api/client';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate, formatMoney } from '../utils/format';

export default function AdminReviewPage() {
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    client.get('/admin/transactions?page=0&size=100')
      .then((response) => {
        const rows = (unwrap(response).content || []).filter((tx) => ['PENDING', 'HOLD'].includes(tx.status));
        setQueue(rows);
        setSelected((current) => (current && rows.some((r) => r.reference === current) ? current : rows[0]?.reference || null));
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load review queue.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!selected) { setInvestigation(null); return; }
    let active = true;
    client.get(`/admin/transactions/${selected}/investigation`)
      .then((response) => active && setInvestigation(unwrap(response)))
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load investigation.'));
    return () => { active = false; };
  }, [selected]);

  async function decide(action) {
    setError('');
    setMessage('');
    try {
      await client.post(`/admin/transactions/${selected}/${action}`);
      setMessage(`Simulated transaction ${selected} ${action === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} transaction.`);
    }
  }

  const visibleQueue = queue.filter((tx) => {
    const matchesStatus = !statusFilter || tx.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || String(tx.reference || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-heading"><div><h1 className="h3">Admin review queue</h1>
        <p className="text-muted">Only an ADMIN can release simulated held or pending money.</p></div></div>
      <ErrorMessage message={error} />
      <SuccessMessage message={message} />
      {queue.length === 0 ? <EmptyState label="No transactions are waiting for review." /> : (
        <>
          <div className="card mb-3"><div className="card-body">
            <div className="filter-bar">
              <select className="form-select form-select-sm" aria-label="Filter review queue by status"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All review states</option>
                <option value="PENDING">PENDING</option>
                <option value="HOLD">HOLD</option>
              </select>
              <input className="form-control form-control-sm search-input" aria-label="Search review queue"
                placeholder="Search reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span className="small text-muted ms-auto">
                {visibleQueue.length} of {queue.length} waiting
              </span>
            </div>
          </div></div>
          {visibleQueue.length === 0 ? <EmptyState label="No transactions match these filters." /> : (
            <div className="row g-3">
              <div className="col-lg-5"><div className="card"><div className="list-group list-group-flush">
                {visibleQueue.map((tx) => (
                  <button key={tx.reference} type="button"
                    className={`list-group-item list-group-item-action ${selected === tx.reference ? 'active' : ''}`}
                    onClick={() => setSelected(tx.reference)}>
                    <div className="d-flex justify-content-between"><strong>{tx.reference}</strong><StatusBadge value={tx.status} /></div>
                    <div className="small mt-1">{formatMoney(tx.amount, tx.currency)} · <RiskBadge level={tx.riskLevel} score={tx.riskScore} /></div>
                  </button>
                ))}
              </div></div></div>
              <div className="col-lg-7"><div className="card"><div className="card-body">
                {investigation && <>
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                    <div>
                      <h2 className="h5 mb-1">{investigation.transaction.reference}</h2>
                      <div className="text-muted small">
                        {formatMoney(investigation.transaction.amount, investigation.transaction.currency)} ·
                        {' '}{formatDate(investigation.transaction.createdAt)}
                      </div>
                    </div>
                    <RiskBadge level={investigation.assessment?.riskLevel || investigation.transaction.riskLevel}
                      score={investigation.assessment?.score ?? investigation.transaction.riskScore} />
                  </div>
                  <div className="alert alert-secondary small" role="note">
                    {investigation.assessment?.deterministicExplanation || 'No assessment recorded.'}
                  </div>
                  <h3 className="h6">Risk signals</h3>
                  <ul className="list-group list-group-flush mb-3">
                    {(investigation.assessment?.hits || []).map((hit) => (
                      <li key={hit.ruleCode} className="list-group-item">
                        <strong>{hit.ruleCode}</strong> ({hit.points} pts) — {hit.detail}
                      </li>
                    ))}
                  </ul>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success" onClick={() => decide('approve')}>Approve simulation</button>
                    <button className="btn btn-outline-danger" onClick={() => decide('reject')}>Reject simulation</button>
                  </div>
                </>}
              </div></div></div>
            </div>
          )}
        </>
      )}
    </>
  );
}
