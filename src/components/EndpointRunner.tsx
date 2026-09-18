import React, { useState } from 'react';
import { Play, Copy, Check, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { API_ENDPOINTS } from '../data/endpoints.js';
import { ApiEndpointDef } from '../types.js';

export const EndpointRunner: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointDef>(API_ENDPOINTS[0]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [requestPath, setRequestPath] = useState<string>(API_ENDPOINTS[0].path);
  const [requestMethod, setRequestMethod] = useState<string>(API_ENDPOINTS[0].method);
  const [requestBody, setRequestBody] = useState<string>(
    API_ENDPOINTS[0].defaultBody ? JSON.stringify(API_ENDPOINTS[0].defaultBody, null, 2) : ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [copiedRes, setCopiedRes] = useState<boolean>(false);

  const categories = ['All', ...Array.from(new Set(API_ENDPOINTS.map(e => e.category)))];

  const filteredEndpoints = API_ENDPOINTS.filter(e => {
    const matchesCat = activeCategory === 'All' || e.category === activeCategory;
    const matchesSearch =
      e.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.method.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectEndpoint = (ep: ApiEndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestPath(ep.path);
    setRequestMethod(ep.method);
    setRequestBody(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '');
    setResponseBody(null);
    setResponseStatus(null);
    setResponseTimeMs(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody(null);
    const start = performance.now();

    try {
      const options: RequestInit = {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      if (['POST', 'PUT', 'PATCH'].includes(requestMethod) && requestBody.trim()) {
        try {
          // Validate JSON syntax before sending
          JSON.parse(requestBody);
          options.body = requestBody;
        } catch (jsonErr: any) {
          setLoading(false);
          setResponseStatus(400);
          setResponseBody(JSON.stringify({ error: 'Invalid JSON body syntax: ' + jsonErr.message }, null, 2));
          return;
        }
      }

      const res = await fetch(requestPath, options);
      const elapsed = Math.round(performance.now() - start);
      setResponseStatus(res.status);
      setResponseTimeMs(elapsed);

      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersObj[key] = val;
      });
      setResponseHeaders(headersObj);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setResponseBody(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseBody(text);
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setResponseTimeMs(elapsed);
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message || 'Network request failed' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    let curl = `curl -X ${requestMethod} "http://localhost:3000${requestPath}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;
    if (['POST', 'PUT', 'PATCH'].includes(requestMethod) && requestBody.trim()) {
      curl += ` \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
    }
    return curl;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    if (responseBody) {
      navigator.clipboard.writeText(responseBody);
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    }
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'PATCH': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      case 'DELETE': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div id="endpoint-runner-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Endpoints Directory */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-[750px]">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            API Endpoints Catalog ({filteredEndpoints.length})
          </h2>
          <input
            id="endpoint-search-input"
            type="text"
            placeholder="Search path, method, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Endpoint List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filteredEndpoints.map(ep => {
            const isSelected = selectedEndpoint.id === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400/80 dark:bg-blue-950/40 dark:border-blue-700'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getMethodBadgeClass(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                    {ep.path}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                  {ep.summary}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Execution Console & Results */}
      <div className="lg:col-span-8 space-y-4">
        {/* Request Builder Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {selectedEndpoint.category}
              </span>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedEndpoint.summary}
              </h1>
              {selectedEndpoint.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedEndpoint.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Copy as cURL command"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedCurl ? 'Copied cURL' : 'cURL'}</span>
              </button>

              <button
                id="execute-api-btn"
                onClick={handleExecute}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{loading ? 'Executing...' : 'Send Request'}</span>
              </button>
            </div>
          </div>

          {/* URL Bar */}
          <div className="mt-4 flex items-center gap-2">
            <select
              value={requestMethod}
              onChange={(e) => setRequestMethod(e.target.value)}
              className="text-xs font-mono font-bold px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400 select-none">
                http://localhost:3000
              </span>
              <input
                id="request-url-input"
                type="text"
                value={requestPath}
                onChange={(e) => setRequestPath(e.target.value)}
                className="w-full text-xs font-mono pl-36 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Request Body Editor for POST / PUT / PATCH */}
          {['POST', 'PUT', 'PATCH'].includes(requestMethod) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Request Payload (JSON Body)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEndpoint.defaultBody) {
                      setRequestBody(JSON.stringify(selectedEndpoint.defaultBody, null, 2));
                    }
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset Default Body
                </button>
              </div>
              <textarea
                id="request-body-input"
                rows={7}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-lg bg-slate-900 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Response Viewer Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-h-[350px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Response
              </span>
              {responseStatus !== null && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'Created' : 'Error'}
                </span>
              )}
              {responseTimeMs !== null && (
                <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {responseTimeMs} ms
                </span>
              )}
              {responseHeaders['x-cache'] && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                    responseHeaders['x-cache'] === 'HIT'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                  title={responseHeaders['x-cache-key'] ? `Cache Key: ${responseHeaders['x-cache-key']}` : 'Redis Cache Status'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Redis: {responseHeaders['x-cache']}
                </span>
              )}
            </div>

            {responseBody && (
              <button
                onClick={handleCopyResponse}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copiedRes ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copiedRes ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Response output */}
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-xs">Dispatching request to server...</p>
              </div>
            ) : responseBody ? (
              <pre className="flex-1 p-4 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-auto max-h-[450px] leading-relaxed select-text border border-slate-800">
                {responseBody}
              </pre>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <Send className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  Select an endpoint from the catalog and click <strong className="text-blue-500">Send Request</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  All requests execute against the live SQLite and Redis accounting backend on port 3000
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
