import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import client, { unwrap } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorMessage, Loading, SuccessMessage } from '../components/Feedback';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { formatDate, formatMoney, idempotencyKey } from '../utils/format';

const STATUS_ORDER = ['SUCCESS', 'PENDING', 'HOLD', 'REJECTED', 'FAILED'];
const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH'];
const STATUS_COLORS = {
  SUCCESS: '#22c55e',
  PENDING: '#f59e0b',
  HOLD: '#ef4444',
  REJECTED: '#64748b',
  FAILED: '#94a3b8'
};
const RISK_COLORS = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
const QUICK_AMOUNTS = ['500.00', '1000.00', '2500.00', '5000.00'];

const TOOLTIP_STYLE = {
  background: 'rgba(7, 17, 34, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.20)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '0.8rem',
  itemStyle: { color: '#ffffff' },
  boxShadow: '0 16px 36px rgba(2, 8, 23, 0.45)'
};

const CUSTOMER_TOOLTIP_STYLE = {
  background: 'rgba(255, 255, 255, 0.98)',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  borderRadius: '10px',
  color: '#0f172a',
  fontSize: '0.8rem',
  itemStyle: { color: '#0f172a' },
  boxShadow: '0 14px 34px rgba(15, 23, 42, 0.14)'
};

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfRange(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (Number(days) - 1));
  return date;
}

function compactMoney(value, currency = 'INR') {
  const number = Number(value ?? 0);
  const compact = new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(number);
  return `${compact} ${currency}`;
}

function buildTrend(transactions, days) {
  const totalDays = Number(days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (totalDays - 1 - index));
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      count: 0,
      amount: 0
    };
  });
  const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  transactions.forEach((tx) => {
    const index = indexByKey.get(localDateKey(tx.createdAt));
    if (index === undefined) return;
    buckets[index].count += 1;
    buckets[index].amount += Number(tx.amount ?? 0);
  });
  return buckets;
}

function buildCashflowTrend(transactions, days) {
  const totalDays = Number(days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (totalDays - 1 - index));
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      added: 0,
      sent: 0
    };
  });
  const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));

  transactions.forEach((tx) => {
    const index = indexByKey.get(localDateKey(tx.createdAt));
    if (index === undefined || tx.status !== 'SUCCESS') return;
    const amount = Number(tx.amount ?? 0);
    if (tx.type === 'FUNDING') buckets[index].added += amount;
    if (tx.type === 'TRANSFER' && tx.senderUserId != null) buckets[index].sent += amount;
  });
  return buckets;
}

function KpiCard({ icon, tone, label, value, hint }) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className="card kpi-card h-100"><div className="card-body d-flex gap-3 align-items-center">
        <div className={`kpi-icon kpi-${tone}`}>{icon}</div>
        <div className="min-width-0">
          <div className="kpi-label text-muted">{label}</div>
          <div className="kpi-value">{value}</div>
          <div className="kpi-hint text-muted">{hint}</div>
        </div>
      </div></div>
    </div>
  );
}

function CustomerDashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500.00');
  const [topUpMessage, setTopUpMessage] = useState('');
  const [topUpError, setTopUpError] = useState('');
  const [range, setRange] = useState('7');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    let active = true;
    setRefreshing(true);
    Promise.all([
      client.get('/wallets/me'),
      client.get('/transactions?page=0&size=100')
    ])
      .then(([walletResponse, historyResponse]) => {
        if (!active) return;
        setWallet(unwrap(walletResponse));
        setActivity(unwrap(historyResponse).content || []);
      })
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load wallet.'))
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => load(), [load]);

  async function addDemoMoney() {
    setTopUpError('');
    setTopUpMessage('');
    try {
      const response = await client.post('/wallets/me/demo-topup',
        { amount: String(topUpAmount), description: 'Simulated demo top-up from dashboard' },
        { headers: { 'Idempotency-Key': idempotencyKey() } });
      const data = unwrap(response);
      setTopUpMessage(`${formatMoney(data.amount, data.currency)} of simulated money added. Reference ${data.reference}.`);
      load();
    } catch (err) {
      setTopUpError(err.response?.data?.message || 'Could not add simulated money.');
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  const firstName = String(user?.fullName || user?.email || 'there').split(/[\s@]/)[0];
  const start = startOfRange(range);
  const inRange = activity.filter((tx) => {
    const date = new Date(tx.createdAt);
    return !Number.isNaN(date.getTime()) && date >= start;
  });

  const added = inRange
    .filter((tx) => tx.type === 'FUNDING' && tx.status === 'SUCCESS')
    .reduce((total, tx) => total + Number(tx.amount ?? 0), 0);
  const sent = inRange
    .filter((tx) => tx.type === 'TRANSFER' && tx.status === 'SUCCESS' && tx.senderUserId != null)
    .reduce((total, tx) => total + Number(tx.amount ?? 0), 0);

  const cashflowData = buildCashflowTrend(inRange, range);
  const statusData = STATUS_ORDER
    .map((name) => ({
      name,
      value: inRange.filter((tx) => tx.status === name).length,
      color: STATUS_COLORS[name]
    }))
    .filter((entry) => entry.value > 0);

  const visibleActivity = inRange.filter((tx) => {
    const matchesStatus = !statusFilter || tx.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || String(tx.reference || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });
  const activeFilterCount = [statusFilter, search.trim()].filter(Boolean).length;

  function clearFilters() {
    setStatusFilter('');
    setSearch('');
  }

  return (
    <>
      <section className="customer-hero mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="hero-kicker">SmartPay wallet</span>
            <h1 className="hero-title">Hi, {firstName} 👋</h1>
            <p className="hero-subtitle">
              Track your pretend balance, try a simulated transfer and watch the fraud engine react in real time.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button className="btn btn-light btn-sm" onClick={load} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/send" className="btn btn-light btn-sm">Send simulated money</Link>
          </div>
        </div>
      </section>

      <ErrorMessage message={error} />

      <div className="row g-3 mb-4">
        <KpiCard icon="₹" tone="blue" label="Available balance"
          value={wallet ? formatMoney(wallet.availableBalance, wallet.currency) : '—'} hint="ready to spend in the demo" />
        <KpiCard icon="≡" tone="violet" label="Ledger balance"
          value={wallet ? formatMoney(wallet.ledgerBalance, wallet.currency) : '—'} hint="recorded balance" />
        <KpiCard icon="+" tone="green" label={`Added · ${range}d`} value={compactMoney(added)}
          hint="simulated top-ups" />
        <KpiCard icon="↗" tone="amber" label={`Sent · ${range}d`} value={compactMoney(sent)}
          hint="successful transfers" />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-4">
          <div className="card customer-topup h-100"><div className="card-body">
            <h2 className="h5">Add demo money</h2>
            <p className="text-muted small">
              No real payment. This only creates fake wallet balance for the portfolio demo.
            </p>
            <ErrorMessage message={topUpError} />
            <SuccessMessage message={topUpMessage} />
            <div className="quick-amounts mb-3">
              {QUICK_AMOUNTS.map((amount) => (
                <button key={amount} type="button"
                  className={`quick-amount ${topUpAmount === amount ? 'active' : ''}`}
                  onClick={() => setTopUpAmount(amount)}>
                  ₹{Number(amount).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <label className="form-label small" htmlFor="topup-amount">Custom amount</label>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <input id="topup-amount" type="number" min="0.01" max="10000" step="0.01"
                className="form-control" style={{ maxWidth: 150 }} value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)} />
              <button className="btn btn-primary" onClick={addDemoMoney}>Add fake money</button>
            </div>
          </div></div>
        </div>
        <div className="col-lg-8">
          <div className="card chart-card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h2 className="h6 mb-0">Your simulated cashflow</h2>
              <select className="form-select form-select-sm w-auto" aria-label="Cashflow window"
                value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashflowData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="addedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval="preserveStartEnd" />
                <YAxis tickFormatter={(value) => compactMoney(value)} width={68} />
                <Tooltip contentStyle={CUSTOMER_TOOLTIP_STYLE}
                  formatter={(value) => [formatMoney(value), 'Simulated amount']} />
                <Legend />
                <Area type="monotone" dataKey="added" name="Added" stroke="#10b981"
                  strokeWidth={2.5} fill="url(#addedFill)" />
                <Area type="monotone" dataKey="sent" name="Sent" stroke="#3b82f6"
                  strokeWidth={2.5} fill="url(#sentFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card chart-card h-100"><div className="card-body">
            <h2 className="h6 mb-2">Activity status</h2>
            {statusData.length === 0 ? <EmptyState label="No activity in this window." /> : (
              <ResponsiveContainer width="100%" height={225}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}
                    paddingAngle={3} stroke="none">
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={CUSTOMER_TOOLTIP_STYLE}
                    formatter={(value) => [`${value} transaction(s)`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div></div>
        </div>
        <div className="col-lg-7">
          <div className="card h-100"><div className="card-body">
            <h2 className="h6 mb-3">How the simulation works</h2>
            <div className="row g-2">
              <div className="col-sm-4">
                <div className="customer-tip"><span className="tip-number">1</span>
                  <strong>Add fake money</strong>
                  <span className="small text-muted">Top up your demo wallet instantly.</span>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="customer-tip"><span className="tip-number">2</span>
                  <strong>Send to a friend</strong>
                  <span className="small text-muted">Try a low-risk or high-risk transfer.</span>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="customer-tip"><span className="tip-number">3</span>
                  <strong>Watch the result</strong>
                  <span className="small text-muted">See SUCCESS, PENDING or HOLD.</span>
                </div>
              </div>
            </div>
            <div className="customer-note mt-3">
              <strong>Remember:</strong> this is a portfolio simulation. No real bank, card, KYC or money is involved.
            </div>
          </div></div>
        </div>
      </div>

      <div className="card"><div className="card-body">
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h5 mb-0">Recent activity</h2>
            <div className="small text-muted">
              Showing {visibleActivity.length} of {inRange.length} rows in the selected window
            </div>
          </div>
          {activeFilterCount > 0 &&
            <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear filters</button>}
        </div>
        <div className="filter-bar mb-3">
          <select className="form-select form-select-sm" aria-label="Filter customer activity by status"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_ORDER.map((status) => <option key={status}>{status}</option>)}
          </select>
          <input className="form-control form-control-sm search-input" aria-label="Search customer activity"
            placeholder="Search reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {visibleActivity.length === 0 ? <EmptyState label="No activity matches these filters." /> : (
          <div className="table-responsive"><table className="table table-sm table-hover align-middle">
            <thead><tr>
              <th>Reference</th><th>Type</th><th>Amount</th>
              <th>Status</th><th>Risk</th><th>Created</th>
            </tr></thead>
            <tbody>{visibleActivity.slice(0, 10).map((tx) => (
              <tr key={tx.reference}>
                <td><Link to={`/transactions/${tx.reference}`}>{tx.reference}</Link></td>
                <td>
                  <span className={`type-pill ${tx.type === 'FUNDING' ? 'type-in' : 'type-out'}`}>
                    {tx.type === 'FUNDING' ? 'Added' : 'Transfer'}
                  </span>
                </td>
                <td>{formatMoney(tx.amount, tx.currency)}</td>
                <td><StatusBadge value={tx.status} /></td>
                <td><RiskBadge level={tx.riskLevel} score={tx.riskScore} /></td>
                <td className="small text-muted">{formatDate(tx.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div></div>
    </>
  );
}

function AdminDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('7');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    let active = true;
    setRefreshing(true);
    client.get('/admin/transactions?page=0&size=200')
      .then((response) => {
        if (active) setTransactions(unwrap(response).content || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load admin data.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(load, [load]);

  const start = startOfRange(range);
  const inRange = transactions.filter((tx) => {
    const date = new Date(tx.createdAt);
    return !Number.isNaN(date.getTime()) && date >= start;
  });

  const statusData = STATUS_ORDER
    .map((name) => ({
      name,
      value: inRange.filter((tx) => tx.status === name).length,
      color: STATUS_COLORS[name]
    }))
    .filter((entry) => entry.value > 0);

  const riskData = RISK_ORDER.map((name) => ({
    name,
    count: inRange.filter((tx) => tx.riskLevel === name).length
  }));

  const trendData = buildTrend(inRange, range);
  const amountData = STATUS_ORDER.map((name) => ({
    name,
    amount: inRange
      .filter((tx) => tx.status === name)
      .reduce((total, tx) => total + Number(tx.amount ?? 0), 0),
    color: STATUS_COLORS[name]
  }));

  const settledVolume = inRange
    .filter((tx) => tx.status === 'SUCCESS')
    .reduce((total, tx) => total + Number(tx.amount ?? 0), 0);
  const awaitingReview = inRange.filter((tx) => ['PENDING', 'HOLD'].includes(tx.status)).length;
  const highRisk = inRange.filter((tx) => tx.riskLevel === 'HIGH').length;

  const tableRows = inRange.filter((tx) => {
    const matchesStatus = !statusFilter || tx.status === statusFilter;
    const matchesRisk = !riskFilter || tx.riskLevel === riskFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || String(tx.reference || '').toLowerCase().includes(term);
    return matchesStatus && matchesRisk && matchesSearch;
  });
  const activeFilterCount = [statusFilter, riskFilter, search.trim()].filter(Boolean).length;

  function toggleStatus(name) {
    if (!name) return;
    setStatusFilter((current) => (current === name ? '' : name));
  }

  function toggleRisk(name) {
    if (!name) return;
    setRiskFilter((current) => (current === name ? '' : name));
  }

  function clearFilters() {
    setStatusFilter('');
    setRiskFilter('');
    setSearch('');
  }

  if (loading) return <Loading />;

  return (
    <>
      <section className="hero-card mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <span className="hero-kicker">SmartPay control centre</span>
            <h1 className="hero-title">Fraud operations overview</h1>
            <p className="hero-subtitle">
              Monitor simulated payments, spot risky patterns and review held money. Every number below
              comes from the transaction search API — nothing here moves real funds.
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="live-pill"><span className="pulse-dot" /> Live demo data</span>
            <button className="btn btn-light btn-sm" onClick={load} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/admin/alerts" className="btn btn-light btn-sm">Fraud alerts</Link>
            <Link to="/admin" className="btn btn-light btn-sm">Review queue</Link>
          </div>
        </div>
      </section>

      <ErrorMessage message={error} />

      <div className="row g-3 mb-4">
        <KpiCard icon="#8" tone="blue" label={`Transactions · ${range}d`} value={inRange.length}
          hint={`from ${transactions.length} loaded rows`} />
        <KpiCard icon="₹" tone="green" label="Settled simulated volume" value={compactMoney(settledVolume)}
          hint="SUCCESS transactions only" />
        <KpiCard icon="!" tone="amber" label="Awaiting review" value={awaitingReview}
          hint="PENDING or HOLD" />
        <KpiCard icon="▲" tone="red" label="High-risk transactions" value={highRisk}
          hint="risk level HIGH" />
      </div>

      <div className="card mb-4"><div className="card-body">
        <div className="filter-bar">
          <label className="small text-muted mb-0" htmlFor="range-filter">Window</label>
          <select id="range-filter" className="form-select form-select-sm"
            value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <select className="form-select form-select-sm" aria-label="Filter by status"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_ORDER.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select className="form-select form-select-sm" aria-label="Filter by risk"
            value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">All risk levels</option>
            {RISK_ORDER.map((level) => <option key={level}>{level}</option>)}
          </select>
          <input className="form-control form-control-sm search-input" aria-label="Search reference"
            placeholder="Search transaction reference…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          {activeFilterCount > 0 &&
            <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear filters</button>}
          <span className="small text-muted ms-auto">
            Click a chart slice or bar to filter the table.
          </span>
        </div>
      </div></div>

      <div className="row g-3 mb-4">
        <div className="col-xl-5">
          <div className="card chart-card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 mb-0">Status mix</h2>
              <span className="small text-muted">click to filter</span>
            </div>
            {statusData.length === 0 ? <EmptyState label="No transactions in this window." /> : (
              <ResponsiveContainer width="100%" height={235}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}
                    paddingAngle={3} stroke="none" className="chart-clickable"
                    onClick={(entry) => toggleStatus(entry?.name || entry?.payload?.name)}>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [`${value} transaction(s)`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div></div>
        </div>
        <div className="col-xl-7">
          <div className="card chart-card h-100"><div className="card-body">
            <h2 className="h6 mb-3">Transaction volume over time</h2>
            <ResponsiveContainer width="100%" height={235}>
              <AreaChart data={trendData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval="preserveStartEnd" />
                <YAxis allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" name="Transactions" stroke="#60a5fa"
                  strokeWidth={2.5} fill="url(#volumeFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card chart-card h-100"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 mb-0">Risk level</h2>
              <span className="small text-muted">click to filter</span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={riskData} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={64} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [`${value} transaction(s)`, 'Count']} />
                <Bar dataKey="count" name="Transactions" radius={[0, 8, 8, 0]}
                  className="chart-clickable"
                  onClick={(entry) => toggleRisk(entry?.name || entry?.payload?.name)}>
                  {riskData.map((entry) => <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
        <div className="col-lg-7">
          <div className="card chart-card h-100"><div className="card-body">
            <h2 className="h6 mb-3">Simulated amount by status</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={amountData} margin={{ top: 4, right: 12, left: 6, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => compactMoney(value)} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [formatMoney(value), 'Simulated amount']} />
                <Bar dataKey="amount" name="Amount" radius={[8, 8, 0, 0]}>
                  {amountData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div></div>
        </div>
      </div>

      <div className="card"><div className="card-body">
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h5 mb-0">Transactions in view</h2>
            <div className="small text-muted">
              Showing {tableRows.length} of {inRange.length} rows in the selected window
            </div>
          </div>
          {activeFilterCount > 0 &&
            <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear filters</button>}
        </div>
        {tableRows.length === 0 ? <EmptyState label="No transactions match these filters." /> : (
          <div className="table-responsive"><table className="table table-sm table-hover align-middle">
            <thead><tr>
              <th>Reference</th><th>Created</th><th>Amount</th>
              <th>Status</th><th>Risk</th><th></th>
            </tr></thead>
            <tbody>{tableRows.map((tx) => (
              <tr key={tx.reference}>
                <td><Link to={`/transactions/${tx.reference}`}>{tx.reference}</Link></td>
                <td className="small text-muted">{formatDate(tx.createdAt)}</td>
                <td>{formatMoney(tx.amount, tx.currency)}</td>
                <td><StatusBadge value={tx.status} /></td>
                <td><RiskBadge level={tx.riskLevel} score={tx.riskScore} /></td>
                <td className="text-end">
                  {['PENDING', 'HOLD'].includes(tx.status) &&
                    <Link to="/admin" className="btn btn-sm btn-outline-primary">Review</Link>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div></div>
    </>
  );
}

export default function DashboardPage() {
  const { hasRole } = useAuth();
  return hasRole('ADMIN') ? <AdminDashboard /> : <CustomerDashboard />;
}
