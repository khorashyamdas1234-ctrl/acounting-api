import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { EndpointRunner } from './components/EndpointRunner.js';
import { DatabaseBrowser } from './components/DatabaseBrowser.js';
import { RedisMonitor } from './components/RedisMonitor.js';
import { SwaggerEmbed } from './components/SwaggerEmbed.js';
import { SystemHealth } from './types.js';
import { BookOpen, CheckCircle, Database, Cpu, Layers, Sparkles, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'runner' | 'swagger' | 'database' | 'redis'>('runner');
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/system/health');
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setHealth(data.data);
        }
      }
    } catch (err) {
      console.warn('Health check error:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header health={health} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Info Hero Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-slate-900/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-500 border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                RapidLinks Accounting Backend Service Active
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete REST API with SQLite database, in-memory Redis cache, and Swagger OpenAPI 3.0 documentation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('runner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'runner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Test Endpoints
            </button>
            <button
              onClick={() => setActiveTab('swagger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'swagger'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Swagger Docs
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'database'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              SQL Browser
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'runner' && <EndpointRunner />}
        {activeTab === 'swagger' && <SwaggerEmbed />}
        {activeTab === 'database' && <DatabaseBrowser />}
        {activeTab === 'redis' && <RedisMonitor />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">RapidLinks Accounting Engine</span>
            <span>•</span>
            <span>Node.js / Express</span>
            <span>•</span>
            <span>Relational SQL (SQLite)</span>
            <span>•</span>
            <span>Redis Cache</span>
            <span>•</span>
            <span>OpenAPI 3.0</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="/swagger.json" target="_blank" rel="noreferrer" className="hover:text-blue-500 transition-colors">
              /swagger.json
            </a>
            <a href="/docs" target="_blank" rel="noreferrer" className="hover:text-blue-500 transition-colors">
              /docs (Swagger UI)
            </a>
            <a href="/api/system/health" target="_blank" rel="noreferrer" className="hover:text-blue-500 transition-colors">
              /api/system/health
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
