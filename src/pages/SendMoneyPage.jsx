import { useState } from 'react';
import { Link } from 'react-router-dom';
import client, { unwrap } from '../api/client';
import { ErrorMessage } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatMoney, idempotencyKey } from '../utils/format';

const QUICK_AMOUNTS = ['100.00', '500.00', '1000.00', '2500.00'];

const OUTCOMES = [
  { icon: '✓', tone: 'green', title: 'LOW risk', body: 'Settles immediately in the simulation.' },
  { icon: '◷', tone: 'amber', title: 'MEDIUM risk', body: 'Waits for an ADMIN review before release.' },
  { icon: '!', tone: 'red', title: 'HIGH risk', body: 'Money is held and an admin alert is raised.' }
];

export default function SendMoneyPage() {
  const [form, setForm] = useState({
    type: 'TRANSFER', receiverEmail: '', amount: '', currency: 'INR',
    description: '', deviceFingerprint: '', locationHint: ''
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const payload = { ...form, amount: String(form.amount) };
      const path = form.type === 'PAYMENT' ? '/payments' : '/transfers';
      const response = await client.post(path, payload, {
        headers: { 'Idempotency-Key': idempotencyKey() }
      });
      setResult(unwrap(response));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send simulated money.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="customer-hero flow-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="hero-kicker">Simulated transfer</span>
            <h1 className="hero-title">Send money</h1>
            <p className="hero-subtitle">
              Pick an amount, add optional risk signals and watch the deterministic fraud engine decide what happens.
            </p>
          </div>
          <Link to="/transactions" className="btn btn-light btn-sm">View history</Link>
        </div>
      </section>

      <ErrorMessage message={error} />

      {result && (
        <div className={`card result-card result-${String(result.riskLevel || 'LOW').toLowerCase()} mb-4`}>
          <div className="card-body d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <span className="result-kicker">Simulated transaction created</span>
              <h2 className="result-reference">{result.reference}</h2>
              <div className="result-amount">{formatMoney(result.amount, result.currency)}</div>
              <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                <StatusBadge value={result.status} />
                <RiskBadge level={result.riskLevel} score={result.riskScore} />
              </div>
            </div>
            <div className="text-end">
              <Link to={`/transactions/${result.reference}`} className="btn btn-sm btn-outline-primary">
                View details and explanation
              </Link>
              <div className="small text-muted mt-2">No real money moved. This is a simulation.</div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card send-card">
            <div className="card-body">
              <div className="send-section-title">
                <span className="step-badge">1</span>
                <div><h2 className="h6 mb-0">Where should it go?</h2>
                  <div className="small text-muted">Choose the simulation type and the receiver.</div></div>
              </div>

              <div className="type-switch" role="group" aria-label="Transaction type">
                <button type="button"
                  className={`type-option ${form.type === 'TRANSFER' ? 'active' : ''}`}
                  onClick={() => update('type', 'TRANSFER')}>
                  <span className="type-option-icon">↗</span>
                  <span><strong>Wallet transfer</strong><small>Credit another demo wallet</small></span>
                </button>
                <button type="button"
                  className={`type-option ${form.type === 'PAYMENT' ? 'active' : ''}`}
                  onClick={() => update('type', 'PAYMENT')}>
                  <span className="type-option-icon">▣</span>
                  <span><strong>Simulated payment</strong><small>Pay a pretend merchant</small></span>
                </button>
              </div>

              <form onSubmit={onSubmit}>
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label" htmlFor="receiverEmail">Receiver email</label>
                    <input id="receiverEmail" type="email" className="form-control" required
                      autoComplete="off" placeholder="receiver@example.com"
                      value={form.receiverEmail}
                      onChange={(e) => update('receiverEmail', e.target.value)} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label" htmlFor="amount">Amount</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input id="amount" type="number" min="0.01" step="0.01" className="form-control" required
                        placeholder="0.00" value={form.amount}
                        onChange={(e) => update('amount', e.target.value)} />
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label small text-muted">Quick amounts</label>
                    <div className="quick-amounts">
                      {QUICK_AMOUNTS.map((amount) => (
                        <button key={amount} type="button"
                          className={`quick-amount ${form.amount === amount ? 'active' : ''}`}
                          onClick={() => update('amount', amount)}>
                          ₹{Number(amount).toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="currency">Currency</label>
                    <input id="currency" className="form-control" maxLength="3" required
                      value={form.currency}
                      onChange={(e) => update('currency', e.target.value.toUpperCase())} />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label" htmlFor="description">Description</label>
                    <input id="description" className="form-control"
                      placeholder="What is this simulated transfer for?"
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)} />
                  </div>
                </div>

                <details className="advanced-panel mt-4">
                  <summary>Risk signals (optional)</summary>
                  <p className="small text-muted mb-3">
                    Unfamiliar devices and unusual locations can add fraud points. Leave these blank for a normal demo.
                  </p>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="deviceFingerprint">Device hint</label>
                      <input id="deviceFingerprint" className="form-control"
                        placeholder="e.g. demo-laptop-01"
                        value={form.deviceFingerprint}
                        onChange={(e) => update('deviceFingerprint', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="locationHint">Location hint</label>
                      <input id="locationHint" className="form-control"
                        placeholder="e.g. Chennai"
                        value={form.locationHint}
                        onChange={(e) => update('locationHint', e.target.value)} />
                    </div>
                  </div>
                </details>

                <div className="send-actions mt-4">
                  <button className="btn btn-primary" disabled={busy}>
                    {busy ? 'Sending simulation…' : 'Send simulated money'}
                  </button>
                  <span className="small text-muted">Idempotency key is added automatically.</span>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card decision-card mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">What happens next?</h2>
              <div className="decision-list">
                {OUTCOMES.map((outcome) => (
                  <div key={outcome.title} className="decision-item">
                    <span className={`decision-icon tone-${outcome.tone}`}>{outcome.icon}</span>
                    <div><strong>{outcome.title}</strong><div className="small text-muted">{outcome.body}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card risk-note">
            <div className="card-body">
              <span className="risk-note-icon">◈</span>
              <h2 className="h6 mt-2 mb-1">Demo-safe by design</h2>
              <p className="small mb-0">
                No bank, card, CVV, KYC or real money is used. The fraud score is deterministic; AI only rewrites the explanation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
