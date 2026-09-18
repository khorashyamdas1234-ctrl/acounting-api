import React from 'react';
import { Database, Server, Cpu, ExternalLink, FileCode, CheckCircle2 } from 'lucide-react';
import { SystemHealth } from '../types.js';

interface HeaderProps {
  health: SystemHealth | null;
  activeTab: 'runner' | 'swagger' | 'database' | 'redis';
  setActiveTab: (tab: 'runner' | 'swagger' | 'database' | 'redis') => void;
}

export const Header: React.FC<HeaderProps> = ({ health, activeTab, setActiveTab }) => {
  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-blue-500/20">
              RL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">RapidLinks Accounting</span>
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono font-medium border border-blue-500/30">
                  REST API &amp; Swagger
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tenant-scoped accounting backend • Relational SQL • Redis Cache Layer
              </p>
            </div>
          </div>

          {/* System status pills */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Port 3000 (Active)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>SQL: {health?.database?.status === 'CONNECTED' ? 'SQLite Ready' : 'Connecting...'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Redis: {health?.redis?.stats?.totalKeys ?? 0} Keys ({health?.redis?.stats?.hitRatio ?? 100}% Hit)</span>
            </div>
          </div>

          {/* Quick links to Swagger Docs & JSON */}
          <div className="flex items-center gap-2">
            <a
              id="header-open-swagger"
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Swagger UI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              id="header-open-openapi-json"
              href="/swagger.json"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>OpenAPI JSON</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-800 pt-1 pb-2 overflow-x-auto text-xs font-medium">
          <button
            id="nav-tab-runner"
            onClick={() => setActiveTab('runner')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'runner'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>Live Endpoint Console</span>
          </button>

          <button
            id="nav-tab-swagger"
            onClick={() => setActiveTab('swagger')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'swagger'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>Swagger OpenAPI UI</span>
          </button>

          <button
            id="nav-tab-database"
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQL Relational Database</span>
          </button>

          <button
            id="nav-tab-redis"
            onClick={() => setActiveTab('redis')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'redis'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Redis Cache Engine</span>
          </button>
        </div>
      </div>
    </header>
  );
};
