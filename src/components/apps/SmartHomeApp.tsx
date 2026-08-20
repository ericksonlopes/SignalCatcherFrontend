import React, { useState } from 'react';
import { 
  Home, 
  Thermometer, 
  Zap, 
  ShieldCheck, 
  Tv, 
  Lightbulb, 
  Power, 
  Cpu, 
  Wifi, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SmartDevice } from '../../types';

interface SmartHomeAppProps {
  devices: SmartDevice[];
  setDevices: React.Dispatch<React.SetStateAction<SmartDevice[]>>;
  onAddLog: (sourceApp: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

export const SmartHomeApp: React.FC<SmartHomeAppProps> = ({
  devices,
  setDevices,
  onAddLog
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('All');

  // Telemetry data for room temperatures & energy consumption
  const telemetryData: { time: string; tempServer: number; tempStudio: number; powerWatts: number }[] = [];

  const handleToggleDevice = (id: string) => {
    setDevices(devices.map((d) => {
      if (d.id === id) {
        const nextStatus = !d.status;
        onAddLog('Smart Home', 'info', `${d.name} (${d.room}) foi ${nextStatus ? 'LIGADO' : 'DESLIGADO'}`);
        return { ...d, status: nextStatus };
      }
      return d;
    }));
  };

  const rooms = ['All', 'Server Rack', 'Studio', 'Lab', 'Living Room', 'Balcony'];

  const filteredDevices = selectedRoom === 'All' 
    ? devices 
    : devices.filter(d => d.room === selectedRoom);

  const totalPowerConsumption = devices
    .filter(d => d.status)
    .reduce((acc, curr) => acc + curr.powerUsageWatts, 0);

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans p-2 sm:p-4 space-y-4 overflow-y-auto">
      {/* Header Banner - Bento Grid Card */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Home className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">Casa Inteligente IoT Hub</h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Zigbee & MQTT OK
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Controle de automação residencial • Sensores de rack • Monitoramento de consumo de energia
            </p>
          </div>
        </div>

        {/* Telemetry Quick Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-zinc-500 text-[10px] uppercase font-semibold">Consumo Atual</div>
              <div className="font-bold text-amber-400">{totalPowerConsumption} W</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center gap-2.5">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-zinc-500 text-[10px] uppercase font-semibold">Server Rack</div>
              <div className="font-bold text-cyan-400">38.5 °C</div>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Bento Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Temperature Chart Bento Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3 font-mono">
            <h3 className="font-bold text-xs text-indigo-400 uppercase flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Telemetria de Temperatura (°C)
            </h3>
            <span className="text-[10px] text-zinc-500">24 horas</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData}>
                <defs>
                  <linearGradient id="tempServerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="tempStudioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={[15, 45]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="tempServer" name="Server Rack (°C)" stroke="#6366f1" fillOpacity={1} fill="url(#tempServerGrad)" />
                <Area type="monotone" dataKey="tempStudio" name="Studio (°C)" stroke="#10b981" fillOpacity={1} fill="url(#tempStudioGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Consumption Chart Bento Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3 font-mono">
            <h3 className="font-bold text-xs text-amber-400 uppercase flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Consumo Energético Total (Watts)
            </h3>
            <span className="text-[10px] text-zinc-500">Pico: 980W</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="powerWatts" name="Watts (W)" stroke="#f59e0b" fillOpacity={1} fill="url(#powerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Room Filters & Device Control Bento Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-xs">
          {rooms.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                selectedRoom === room
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {room}
            </button>
          ))}
        </div>

        {/* Devices Bento Grid */}
        {filteredDevices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center text-zinc-500 font-mono text-xs">
            Nenhum dispositivo encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  device.status
                    ? 'bg-zinc-900/90 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-zinc-800">
                      {device.room}
                    </span>
                    <button
                      onClick={() => handleToggleDevice(device.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        device.status
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="font-bold text-xs text-zinc-200 mb-1">{device.name}</h4>

                  {device.value !== undefined && (
                    <div className="text-sm font-mono font-bold text-emerald-400 mb-2">
                      {device.value} {device.unit}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>{device.powerUsageWatts} W</span>
                  <span className={device.status ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {device.status ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
