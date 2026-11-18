import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client, { unwrap } from '../api/client';
import { ErrorMessage, Loading } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate, formatMoney } from '../utils/format';

export default function TransactionDetailPage() {
  const { reference } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      client.get(`/transactions/${reference}`),
      client.get(`/transactions/${reference}/assessment`)
    ])
      .then(([txResponse, assessmentResponse]) => {
        if (!active) return;
        setTransaction(unwrap(txResponse));
        setAssessment(unwrap(assessmentResponse));
      })
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load transaction.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [reference]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  const score = Number(transaction.riskScore ?? 0);

  return (
    <>
      <section className="customer-hero flow-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="hero-kicker">Simulation detail</span>
            <h1 className="hero-title detail-reference">{transaction.reference}</h1>
            <p className="hero-subtitle">Result and deterministic fraud explanation for this simulated transaction.</p>
            <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
              <StatusBadge value={transaction.status} />
              <RiskBadge level={transaction.riskLevel} score={transaction.riskScore} />
            </div>
          </div>
          <Link to="/transactions" className="btn btn-light btn-sm">← Back to history</Link>
        </div>
      </section>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card detail-card mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">Transaction summary</h2>
              <div className="detail-amount">{formatMoney(transaction.amount, transaction.currency)}</div>
              <dl className="detail-grid">
                <div><dt>Type</dt><dd>{transaction.type}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={transaction.status} /></dd></div>
                <div><dt>Created</dt><dd>{formatDate(transaction.createdAt)}</dd></div>
                <div><dt>Description</dt><dd>{transaction.description || '—'}</dd></div>
                <div><dt>Device hint</dt><dd>{transaction.deviceFingerprint || '—'}</dd></div>
                <div><dt>Location hint</dt><dd>{transaction.locationHint || '—'}</dd></div>
              </dl>
            </div>
          </div>

          <div className="card detail-card">
            <div className="card-body">
              <h2 className="h6 mb-2">Fraud assessment</h2>
              <div className="score-row">
                <div className="score-track"><div className="score-fill" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div>
                <strong>{score}/100</strong>
              </div>
              <p className="deterministic-note">{assessment?.deterministicExplanation}</p>
              <p className="small text-muted">{assessment?.aiExplanation}</p>
              <div className="small ai-source">
                AI source: <strong>{assessment?.aiSource}</strong>. AI wording never changes a decision.
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card detail-card h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Rule hits</h2>
              {(assessment?.hits || []).length === 0 ? (
                <div className="empty-hits">No rule was triggered for this simulation.</div>
              ) : (
                <ul className="hit-list">
                  {(assessment?.hits || []).map((hit) => (
                    <li key={hit.ruleCode}>
                      <div><strong>{hit.ruleCode}</strong><div className="small text-muted">{hit.detail}</div></div>
                      <span className="hit-points">{hit.points} pts</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="customer-note mt-3">
                <strong>Remember:</strong> the decision is computed before any AI wording is added.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
