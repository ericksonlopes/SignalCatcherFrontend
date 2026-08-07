import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  Server, 
  Code2, 
  Send, 
  Database, 
  Zap, 
  Layers,
  Sparkles
} from 'lucide-react';
import { ApiEndpoint } from '../../types';

interface FastApiDocsAppProps {
  endpoints: ApiEndpoint[];
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export const FastApiDocsApp: React.FC<FastApiDocsAppProps> = ({ endpoints, onAddLog }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(endpoints[0]);
  const [requestParam, setRequestParam] = useState<string>('');
  const [responsePayload, setResponsePayload] = useState<any | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleTestRequest = () => {
    setIsLoading(true);
    setResponsePayload(null);
    setResponseStatus(null);

    const start = performance.now();

    setTimeout(() => {
      const duration = Math.round(performance.now() - start);
      setIsLoading(false);
      setResponseStatus(selectedEndpoint.method === 'POST' ? 201 : 200);
      setResponseLatency(duration);
      setResponsePayload(selectedEndpoint.responseExample);
      onAddLog('FastAPI REST', 'success', `${selectedEndpoint.method} ${selectedEndpoint.path} 200 OK (${duration}ms)`);
    }, 450);
  };

  const generatePythonCode = (ep: ApiEndpoint) => {
    return `# FastAPI Endpoint Definition (main.py)
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import asyncpg

app = FastAPI(title="SignalCatcher API", version="2.4.0")

@app.${ep.method.toLowerCase()}("${ep.path}")
async def handle_request():
    """
    ${ep.description}
    """
    # Connect to PostgreSQL database signalcatcher_db
    # return processed JSON response
    return ${JSON.stringify(ep.responseExample, null, 2)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto">
      {/* Header Banner - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Terminal className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">FastAPI REST OpenAPI Interactive Sandbox</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Swagger Docs Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Servidor backend Python em FastAPI para requisições em tempo real, rotas assíncronas e PostgreSQL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-medium">
            uvicorn main:app --port 8000
          </span>
        </div>
      </div>

      {/* Main Grid: Endpoints list + Interactive Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono">
        {/* Endpoints Sidebar Bento Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-3">
          <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Endpoints Disponíveis
          </h3>

          <div className="space-y-1.5">
            {endpoints.map((ep) => (
              <button
                key={ep.path}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setResponsePayload(null);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  selectedEndpoint.path === ep.path
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-bold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate text-xs">{ep.path}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tester & Python Code Viewer Bento Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
          <div>
            {/* Endpoint Selected Details */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-bold text-sm text-zinc-100">{selectedEndpoint.path}</span>
              </div>

              <button
                onClick={handleTestRequest}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Enviando...' : 'Executar Teste'}</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-sans mb-4">
              {selectedEndpoint.description}
            </p>

            {/* Response Preview Box */}
            {responsePayload && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <span>Status HTTP:</span>
                    <strong className="text-emerald-400">{responseStatus} OK</strong>
                  </span>
                  <span>Latência: <strong className="text-indigo-400">{responseLatency}ms</strong></span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 max-h-64 overflow-y-auto font-mono text-xs text-emerald-300">
                  <pre>{JSON.stringify(responsePayload, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Python Code Generator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Código Python FastAPI Nativo:</span>
                </span>
                <button
                  onClick={() => copyToClipboard(generatePythonCode(selectedEndpoint))}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-[11px] transition-colors"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs text-zinc-300 max-h-48 overflow-y-auto">
                <pre>{generatePythonCode(selectedEndpoint)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
