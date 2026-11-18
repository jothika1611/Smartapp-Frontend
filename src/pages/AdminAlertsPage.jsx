import { useCallback, useEffect, useState } from 'react';
import client, { unwrap } from '../api/client';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../utils/format';

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
}

const NEW_RULE = {
  code: '', name: '', description: '', category: 'CUSTOM',
  maxPoints: 10, thresholdValue: '1000.00', timeWindowMinutes: 60, enabled: true
};

export default function AdminAlertsPage() {
  const [tab, setTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState({});
  const [newRule, setNewRule] = useState(NEW_RULE);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: '0', size: '50' });
    if (status) params.set('status', status);
    client.get(`/admin/fraud/alerts?${params}`)
      .then((response) => setAlerts(unwrap(response).content || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load alerts.'))
      .finally(() => setLoading(false));
  }, [status]);

  const loadRules = useCallback(() => {
    setLoading(true);
    client.get('/admin/fraud/rules?page=0&size=50')
      .then((response) => setRules(unwrap(response).content || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load rules.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setError('');
    if (tab === 'alerts') loadAlerts();
    else loadRules();
  }, [tab, loadAlerts, loadRules]);

  async function alertAction(alertId, action) {
    setError('');
    setMessage('');
    try {
      const body = action === 'resolve' ? { resolutionNotes: notes[alertId] || 'Reviewed in demo UI' } : undefined;
      await client.post(`/admin/fraud/alerts/${alertId}/${action}`, body);
      setMessage(`Simulated alert ${alertId} ${action === 'assign' ? 'assigned' : 'resolved'}.`);
      loadAlerts();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} alert.`);
    }
  }

  async function createRule(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await client.post('/admin/fraud/rules', {
        ...newRule,
        maxPoints: Number(newRule.maxPoints),
        thresholdValue: String(newRule.thresholdValue),
        timeWindowMinutes: newRule.timeWindowMinutes === '' ? null : Number(newRule.timeWindowMinutes)
      });
      setMessage('Simulated scoring rule created.');
      setNewRule(NEW_RULE);
      loadRules();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create rule.');
    }
  }

  async function disableRule(ruleId) {
    setError('');
    setMessage('');
    try {
      await client.delete(`/admin/fraud/rules/${ruleId}`);
      setMessage('Rule disabled. Historical hits are preserved.');
      loadRules();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disable rule.');
    }
  }

  return (
    <>
      <div className="page-heading"><div><h1 className="h3">Fraud operations</h1>
        <p className="text-muted">Alerts and scoring rules. AI text never authorises a payment.</p></div></div>
      <div className="btn-group mb-3">
        <button className={`btn ${tab === 'alerts' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTab('alerts')}>Alerts</button>
        <button className={`btn ${tab === 'rules' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTab('rules')}>Rules</button>
      </div>
      <ErrorMessage message={error} />
      <SuccessMessage message={message} />
      {loading ? <Loading /> : tab === 'alerts' ? (
        <div className="card"><div className="card-body">
          <div className="mb-3">
            <select className="form-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All alert statuses</option>
              {['OPEN', 'INVESTIGATING', 'RESOLVED'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {alerts.length === 0 ? <EmptyState label="No fraud alerts in this view." /> : (
            <div className="table-responsive"><table className="table table-sm align-middle">
              <thead><tr><th>ID</th><th>Transaction</th><th>From</th><th>To</th><th>Severity</th><th>Status</th><th>Score</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>{alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.id}</td>
                  <td><strong>{alert.transactionReference}</strong></td>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar">{initials(alert.senderName)}</span>
                      <span><span className="user-name">{alert.senderName}</span>
                        <span className="user-email text-muted d-block">{alert.senderEmail}</span></span>
                    </div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar receiver">{initials(alert.receiverName)}</span>
                      <span><span className="user-name">{alert.receiverName}</span>
                        <span className="user-email text-muted d-block">{alert.receiverEmail}</span></span>
                    </div>
                  </td>
                  <td><RiskBadge level={alert.severity} score={alert.riskScore} /></td>
                  <td><StatusBadge value={alert.status} /></td>
                  <td>{alert.riskScore}</td>
                  <td className="small text-muted">{formatDate(alert.createdAt)}</td>
                  <td>
                    <div className="d-flex gap-1 align-items-center flex-wrap">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => alertAction(alert.id, 'assign')}>Assign</button>
                      <input className="form-control form-control-sm" style={{ width: 160 }} placeholder="Resolution notes"
                        value={notes[alert.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [alert.id]: e.target.value })} />
                      <button className="btn btn-sm btn-outline-success" onClick={() => alertAction(alert.id, 'resolve')}>Resolve</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div></div>
      ) : (
        <>
          <div className="card mb-3"><div className="card-body">
            {rules.length === 0 ? <EmptyState label="No scoring rules configured." /> : (
              <div className="table-responsive"><table className="table table-sm align-middle">
                <thead><tr><th>Code</th><th>Name</th><th>Points</th><th>Threshold</th><th>Window</th><th>Enabled</th><th></th></tr></thead>
                <tbody>{rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.code}</td><td>{rule.name}</td><td>{rule.maxPoints}</td>
                    <td>{rule.thresholdValue ?? '—'}</td><td>{rule.timeWindowMinutes ?? '—'}</td>
                    <td>{rule.enabled ? 'Yes' : 'No'}</td>
                    <td>{rule.enabled && <button className="btn btn-sm btn-outline-danger" onClick={() => disableRule(rule.id)}>Disable</button>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div></div>
          <div className="card"><div className="card-body"><h2 className="h5">Create simulated scoring rule</h2>
            <form className="row g-2" onSubmit={createRule}>
              {Object.keys(NEW_RULE).map((field) => (
                <div className="col-md-4" key={field}>
                  <label className="form-label small" htmlFor={`rule-${field}`}>{field}</label>
                  {field === 'enabled' ? (
                    <select id={`rule-${field}`} className="form-select" value={String(newRule[field])}
                      onChange={(e) => setNewRule({ ...newRule, [field]: e.target.value === 'true' })}>
                      <option value="true">true</option><option value="false">false</option>
                    </select>
                  ) : (
                    <input id={`rule-${field}`} className="form-control" required={field !== 'description'}
                      value={newRule[field]}
                      onChange={(e) => setNewRule({ ...newRule, [field]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="col-12"><button className="btn btn-primary">Create rule</button></div>
            </form>
          </div></div>
        </>
      )}
    </>
  );
}
