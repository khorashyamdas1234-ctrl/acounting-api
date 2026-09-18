import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Trash2, Key, Clock, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { RedisKeyItem } from '../types.js';

export const RedisMonitor: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [keys, setKeys] = useState<RedisKeyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [flushing, setFlushing] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    cache: string;
    cacheKey: string;
    latency: string;
    timeMs: number;
    summary: string;
  } | null>(null);

  const fetchRedisData = async () => {
    setLoading(true);
    try {
      const [statsRes, keysRes] = await Promise.all([
        fetch('/api/redis/stats').then(r => r.json()),
        fetch('/api/redis/keys').then(r => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (keysRes.success) setKeys(keysRes.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const runEndpointBenchmark = async (endpoint: string, label: string) => {
    setTestLoading(endpoint);
    const start = performance.now();
    try {
      const res = await fetch(endpoint);
      const elapsed = Math.round(performance.now() - start);
      const cacheHeader = res.headers.get('x-cache') || 'N/A';
      const cacheKeyHeader = res.headers.get('x-cache-key') || '';
      const responseTimeHeader = res.headers.get('x-response-time') || `${elapsed}ms`;
      const json = await res.json();
      
      const count = Array.isArray(json.data) ? json.data.length : json.data ? 1 : 0;
      setTestResult({
        endpoint: label,
        cache: cacheHeader,
        cacheKey: cacheKeyHeader,
        latency: responseTimeHeader,
        timeMs: elapsed,
        summary: `Received ${count} record(s) - ${json.message || 'OK'}`,
      });

      await fetchRedisData();
    } catch (err: any) {
      setTestResult({
        endpoint: label,
        cache: 'ERROR',
        cacheKey: '',
        latency: '0ms',
        timeMs: 0,
        summary: err.message,
      });
    } finally {
      setTestLoading(null);
    }
  };

  const handleFlush = async () => {
    if (!confirm('Are you sure you want to flush all Redis cache keys?')) return;
    setFlushing(true);
    try {
      const res = await fetch('/api/redis/flush', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFlashMessage('Cache successfully cleared');
        setTimeout(() => setFlashMessage(null), 3000);
        await fetchRedisData();
      }
    } catch {} finally {
      setFlushing(false);
    }
  };

  useEffect(() => {
    fetchRedisData();
    const interval = setInterval(fetchRedisData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="redis-monitor-root" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Redis In-Memory Cache Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            High-performance caching layer handling JWT sessions, tenant themes, dashboard counters, and voucher prefixes with automatic TTL eviction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRedisData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleFlush}
            disabled={flushing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Flush Cache</span>
          </button>
        </div>
      </div>

      {flashMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{flashMessage}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Cache Hit Ratio
          </span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats?.hitRatio ?? 100}%
          </div>
          <span className="text-[10px] text-slate-400">Total efficiency</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Active Keys
          </span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats?.totalKeys ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">In memory</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Cache Hits
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.hits ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Served from RAM</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Cache Misses
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.misses ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">SQL fallbacks</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Operations
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.operations ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">GET/SET commands</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Uptime
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.uptimeSeconds ?? 0}s
          </div>
          <span className="text-[10px] text-slate-400">Online seconds</span>
        </div>
      </div>

      {/* Interceptor Verification & Performance Benchmark Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Redis Interceptor Live Verification: Chart of Accounts & Document Series
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            Interceptor Active
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Test frequent API calls below. The first call executes against SQLite database and stores response in Redis (<span className="font-mono text-amber-500">X-Cache: MISS</span>). Subsequent requests are intercepted in under 2ms directly from Redis memory (<span className="font-mono text-emerald-500">X-Cache: HIT</span>).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <button
            type="button"
            onClick={() => runEndpointBenchmark('/accounting/chart-of-accounts', 'GET /accounting/chart-of-accounts')}
            disabled={testLoading !== null}
            className="flex flex-col text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/20 transition-all text-xs group"
          >
            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              <span>Chart of Accounts</span>
              <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">300s TTL</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 mt-1">/accounting/chart-of-accounts</span>
            <span className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500" />
              {testLoading === '/accounting/chart-of-accounts' ? 'Executing...' : 'Click to test cache'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => runEndpointBenchmark('/accounting/document-series', 'GET /accounting/document-series')}
            disabled={testLoading !== null}
            className="flex flex-col text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/20 transition-all text-xs group"
          >
            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
              <span>Document Series Configs</span>
              <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">300s TTL</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 mt-1">/accounting/document-series</span>
            <span className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              {testLoading === '/accounting/document-series' ? 'Executing...' : 'Click to test cache'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => runEndpointBenchmark('/accounting/document-series/generate/SALES_INVOICE', 'Generate Series: SALES_INVOICE')}
            disabled={testLoading !== null}
            className="flex flex-col text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-purple-50/20 transition-all text-xs group"
          >
            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center justify-between">
              <span>Generate Next Series</span>
              <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">60s TTL</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 mt-1">/accounting/document-series/generate/SALES_INVOICE</span>
            <span className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-500" />
              {testLoading === '/accounting/document-series/generate/SALES_INVOICE' ? 'Executing...' : 'Click to test cache'}
            </span>
          </button>
        </div>

        {testResult && (
          <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{testResult.endpoint}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    testResult.cache === 'HIT'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  X-Cache: {testResult.cache}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Response time: <strong className="text-emerald-300">{testResult.latency}</strong> ({testResult.timeMs}ms network)
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Cache Key: <code className="text-blue-400">{testResult.cacheKey || 'N/A'}</code>
              </div>
              <div className="text-[11px] text-slate-300">
                {testResult.summary}
              </div>
            </div>
            <button
              onClick={() => runEndpointBenchmark(
                testResult.endpoint.includes('generate')
                  ? '/accounting/document-series/generate/SALES_INVOICE'
                  : testResult.endpoint.includes('document-series')
                  ? '/accounting/document-series'
                  : '/accounting/chart-of-accounts',
                testResult.endpoint
              )}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap self-start md:self-center transition-colors"
            >
              Run Again (Verify HIT)
            </button>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cached Keys in Redis Store ({keys.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Auto-refreshes every 5s
          </span>
        </div>

        {keys.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-mono">
                  <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Key Name</th>
                  <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">TTL Remaining</th>
                  <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Access Count</th>
                  <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Size</th>
                  <th className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {keys.map((k) => (
                  <tr key={k.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-bold truncate max-w-xs">
                      {k.key}
                    </td>
                    <td className="p-2.5">
                      {k.ttlRemainingSeconds !== null ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Clock className="w-3 h-3" />
                          {k.ttlRemainingSeconds}s
                        </span>
                      ) : (
                        <span className="text-slate-400">Persistent</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300">
                      {k.accessCount} hits
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {k.sizeBytes} bytes
                    </td>
                    <td className="p-2.5 text-slate-400">
                      {k.createdAt.split('T')[1]?.substring(0, 8) || k.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Key className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-500">No cached keys currently in Redis</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Trigger requests like <code className="text-blue-500">GET /tenant/theme</code> or <code className="text-blue-500">POST /auth/login</code> to see keys populate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
