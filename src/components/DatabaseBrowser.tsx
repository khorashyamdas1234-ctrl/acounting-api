import React, { useState, useEffect } from 'react';
import { Database, Play, Table, RefreshCw, Code, CheckCircle, AlertTriangle } from 'lucide-react';

export const DatabaseBrowser: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('chart_of_accounts');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [customSql, setCustomSql] = useState<string>('SELECT id, code, name, balance FROM chart_of_accounts ORDER BY code ASC');
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [queryRows, setQueryRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const tables = [
    'tenants',
    'users',
    'warehouses',
    'customer_pickup_warehouses',
    'account_groups',
    'chart_of_accounts',
    'voucher_books',
    'financial_years',
    'financial_periods',
    'general_documents',
    'general_document_lines',
    'payout_documents',
    'vendors',
    'bank_accounts'
  ];

  const fetchHealthAndCounts = async () => {
    try {
      const res = await fetch('/api/system/health');
      const data = await res.json();
      if (data.data?.database?.tables) {
        setTableCounts(data.data.database.tables);
      }
    } catch {}
  };

  const executeSql = async (sql: string) => {
    setLoading(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/system/sql-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setQueryColumns(data.data.columns || []);
        setQueryRows(data.data.rows || []);
      } else {
        setQueryError(data.message || data.error || 'Query failed');
        setQueryColumns([]);
        setQueryRows([]);
      }
    } catch (err: any) {
      setQueryError(err.message || 'Execution error');
      setQueryColumns([]);
      setQueryRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndCounts();
    executeSql(`SELECT * FROM ${selectedTable} LIMIT 20`);
  }, []);

  const handleTableClick = (tbl: string) => {
    setSelectedTable(tbl);
    const sql = `SELECT * FROM ${tbl} LIMIT 25`;
    setCustomSql(sql);
    executeSql(sql);
  };

  return (
    <div id="database-browser-root" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Relational SQLite Accounting Database
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Persisted relational schema supporting multi-tenant double-entry ledgers, vouchers, and financial documents.
          </p>
        </div>

        <button
          onClick={() => {
            fetchHealthAndCounts();
            executeSql(customSql);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tables list */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Database Tables ({tables.length})
          </h3>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {tables.map(tbl => {
              const count = tableCounts[tbl] ?? 0;
              const isSelected = selectedTable === tbl;
              return (
                <button
                  key={tbl}
                  onClick={() => handleTableClick(tbl)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 text-blue-700 dark:bg-blue-950/50 dark:border-blue-600 dark:text-blue-300'
                      : 'bg-slate-50/50 border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Table className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tbl}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {count} rows
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: SQL Query Editor & Data Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Query Console */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-500" />
                <span>SQL Query Console (SELECT only)</span>
              </label>
              <button
                onClick={() => executeSql(customSql)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run Query</span>
              </button>
            </div>

            <textarea
              id="sql-query-input"
              rows={3}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-lg bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SELECT * FROM chart_of_accounts WHERE balance > 0 LIMIT 10"
            />

            {queryError && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}
          </div>

          {/* Table Results */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Query Result ({queryRows.length} rows returned)
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                <p className="text-xs">Querying SQLite database...</p>
              </div>
            ) : queryRows.length > 0 ? (
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                      {queryColumns.map(col => (
                        <th key={col} className="p-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {queryRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                        {queryColumns.map(col => (
                          <td key={col} className="p-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-xs truncate">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-400 italic">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <Table className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-medium text-slate-500">No records to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
