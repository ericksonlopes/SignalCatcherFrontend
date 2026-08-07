import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  BarChart2, 
  Calendar, 
  Filter, 
  Zap, 
  ArrowDownRight, 
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { FollowerStats } from '../../types';

interface FollowerAnalyticsAppProps {
  history: FollowerStats[];
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export const FollowerAnalyticsApp: React.FC<FollowerAnalyticsAppProps> = ({
  history,
  onAddLog
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'youtube' | 'instagram' | 'xTwitter' | 'tiktok'>('all');

  const latestStats = history[history.length - 1] || {
    youtube: 1422950,
    instagram: 311300,
    xTwitter: 190450,
    tiktok: 524100,
    gained: 1120,
    lost: 140,
    netChange: 980
  };

  const totalFollowers = latestStats.youtube + latestStats.instagram + latestStats.xTwitter + latestStats.tiktok;

  const totalLostToday = history.reduce((sum, item) => sum + item.lost, 0);
  const totalGainedToday = history.reduce((sum, item) => sum + item.gained, 0);

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto">
      {/* Top Banner - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <TrendingDown className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Perda de Seguidores & Retenção</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                Análise Anti-Churn
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Monitoramento diário de perda/ganho de audiência no YouTube, Instagram, X (Twitter) e TikTok
            </p>
          </div>
        </div>

        {/* Global Summary Bento Metrics */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto font-mono text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Audiência Total</div>
            <div className="text-lg font-bold text-indigo-400">{(totalFollowers / 1000000).toFixed(2)}M</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Ganhos Hoje</div>
            <div className="text-lg font-bold text-emerald-400">+{totalGainedToday.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center">
            <div className="text-zinc-500 text-[10px] uppercase font-semibold">Perdas Hoje</div>
            <div className="text-lg font-bold text-rose-400">-{totalLostToday.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Charts Bento Grid Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gain vs Loss Bar Chart Bento Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3 font-mono">
            <h3 className="font-bold text-xs text-zinc-200 uppercase flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Ganhos vs. Perdas de Seguidores por Horário
            </h3>
            <span className="text-[10px] text-zinc-500">Taxa de Churn Hoje</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="timestamp" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="gained" name="Novos Seguidores" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="lost" name="Seguidores Perdidos" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Breakdown Bento Box */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all space-y-3 font-mono">
          <h3 className="font-bold text-xs text-indigo-400 uppercase flex items-center gap-2">
            <Users className="w-4 h-4" />
            Distribuição por Plataforma
          </h3>

          <div className="space-y-2.5 text-xs">
            {/* YouTube */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-200">YouTube</div>
                <div className="text-[10px] text-zinc-500">Comunidade Principal</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-indigo-400">{latestStats.youtube.toLocaleString()}</div>
                <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +0.8%
                </div>
              </div>
            </div>

            {/* Instagram */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-200">Instagram</div>
                <div className="text-[10px] text-zinc-500">Reels & Stories</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-400">{latestStats.instagram.toLocaleString()}</div>
                <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +0.4%
                </div>
              </div>
            </div>

            {/* X Twitter */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-200">X / Twitter</div>
                <div className="text-[10px] text-zinc-500">Dev & Tech Threads</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-cyan-400">{latestStats.xTwitter.toLocaleString()}</div>
                <div className="text-[10px] text-rose-400 flex items-center justify-end gap-0.5">
                  <ArrowDownRight className="w-3 h-3" /> -0.2%
                </div>
              </div>
            </div>

            {/* TikTok */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-zinc-200">TikTok</div>
                <div className="text-[10px] text-zinc-500">Short Code Demos</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-pink-400">{latestStats.tiktok.toLocaleString()}</div>
                <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +1.2%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unfollow Incident Log Bento Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all space-y-3 font-mono">
        <h3 className="font-bold text-xs text-amber-400 uppercase flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Alertas de Perda de Seguidores e Motivos Detectados
        </h3>

        <div className="space-y-2 text-xs">
          {history.filter(h => h.churnReason).map((h, i) => (
            <div key={i} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-zinc-200">{h.churnReason}</div>
                  <div className="text-[11px] text-zinc-400">Horário: {h.timestamp} • Perda de {h.lost} inscritos</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                -{h.lost}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
