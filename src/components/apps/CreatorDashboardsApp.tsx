import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Video, 
  Eye, 
  Sparkles, 
  Calendar,
  Filter,
  CheckCircle2,
  PieChart,
  Grid
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import { CreatorMetric } from '../../types';
import { D3CustomHeatmap } from '../charts/D3CustomHeatmap';

interface CreatorDashboardsAppProps {
  creators: CreatorMetric[];
}

export const CreatorDashboardsApp: React.FC<CreatorDashboardsAppProps> = ({ creators }) => {
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');

  const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Recharts views dataset
  const viewsChartData = daysOfWeek.map((day, idx) => {
    return {
      day,
      TechLead: creators[0]?.weeklyViews[idx] || 0,
      Fireship: creators[1]?.weeklyViews[idx] || 0,
      LexFridman: creators[2]?.weeklyViews[idx] || 0,
      MKBHD: creators[3]?.weeklyViews[idx] || 0
    };
  });

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto">
      {/* Header Banner - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BarChart3 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Dashboards Analíticos dos Criadores</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                Intelligence Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Visualização de desempenho semanal, consistência de publicação e engajamento comparativo
            </p>
          </div>
        </div>

        {/* Quick Filter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">Filtrar Criador:</span>
          <select
            value={selectedCreatorId}
            onChange={(e) => setSelectedCreatorId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos os Criadores (Comparativo)</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.creatorName} ({c.handle})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Creators Profile Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {creators.map((creator) => (
          <div
            key={creator.id}
            onClick={() => setSelectedCreatorId(creator.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedCreatorId === creator.id || selectedCreatorId === 'all'
                ? 'bg-zinc-900/90 border-indigo-500/40 shadow-sm'
                : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <img src={creator.avatar} alt="" className="w-10 h-10 rounded-full border border-indigo-500/40" />
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-zinc-100 truncate">{creator.creatorName}</h4>
                <div className="text-xs font-mono text-indigo-400">{creator.handle}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono border-t border-zinc-800/80 pt-2.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Inscritos:</span>
                <span className="font-bold text-indigo-400">{(creator.subscribers / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Taxa de Engajamento:</span>
                <span className="font-bold text-emerald-400">{creator.engagementRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Consistência Upload:</span>
                <span className="font-bold text-cyan-400">{creator.uploadConsistency}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Weekly Views Trend & D3 Heatmap Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recharts Weekly Views Bento Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3 font-mono">
            <h3 className="font-bold text-xs text-indigo-400 uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Visualizações Semanais Comparativas
            </h3>
            <span className="text-[10px] text-zinc-500">Recharts Interactive</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="TechLead" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Fireship" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="LexFridman" stroke="#a855f7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="MKBHD" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D3 Heatmap Bento Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 font-mono">
              <h3 className="font-bold text-xs text-indigo-400 uppercase flex items-center gap-2">
                <Grid className="w-4 h-4" />
                D3.js: Horários de Maior Retenção e Upload
              </h3>
              <span className="text-[10px] text-zinc-500">Matriz D3</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mb-2">
              Análise de densidade de publicação vs engajamento de visualização por hora do dia
            </p>
          </div>

          <D3CustomHeatmap />
        </div>
      </div>
    </div>
  );
};
