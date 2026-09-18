import React from 'react';
import { ExternalLink, RefreshCw, Layers } from 'lucide-react';

export const SwaggerEmbed: React.FC = () => {
  return (
    <div id="swagger-embed-root" className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Official OpenAPI 3.0 / Swagger Interactive Documentation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated from standard OpenAPI schema. Test live requests with 'Try It Out'.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Open in Full Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="w-full h-[780px] bg-white rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <iframe
          src="/docs"
          title="Swagger UI"
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
};
