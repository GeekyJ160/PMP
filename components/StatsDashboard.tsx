
import React from 'react';
import { UserState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
  userState: UserState;
  onBack: () => void;
}

const data = [
  { name: 'Mon', rhymes: 45, flow: 70 },
  { name: 'Tue', rhymes: 52, flow: 75 },
  { name: 'Wed', rhymes: 60, flow: 80 },
  { name: 'Thu', rhymes: 55, flow: 82 },
  { name: 'Fri', rhymes: 72, flow: 88 },
  { name: 'Sat', rhymes: 88, flow: 92 },
  { name: 'Sun', rhymes: 95, flow: 95 },
];

const StatsDashboard: React.FC<Props> = ({ userState, onBack }) => {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-700">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-4xl font-black metallic-text tracking-tighter">STUDIO ANALYTICS</h2>
          <p className="text-gray-500 uppercase text-xs font-bold tracking-[0.3em] mt-1">Lyrical Intelligence Dashboard</p>
        </div>
        <button 
          onClick={onBack}
          className="p-4 rounded-2xl glass hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm"
        >
          <span className="material-icons-round">arrow_back</span>
          Back to Studio
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Rhyme Score', val: `${userState.rhymeScore}%`, icon: 'alternate_email', color: 'text-purple-400' },
          { label: 'Flow Match', val: `${userState.flowScore}%`, icon: 'timeline', color: 'text-blue-400' },
          { label: 'Energy Peak', val: `${userState.energyScore}%`, icon: 'bolt', color: 'text-yellow-400' },
          { label: 'Session BPM', val: userState.bpm, icon: 'speed', color: 'text-green-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5">
             <div className="flex items-center justify-between mb-2">
                <span className="material-icons-round text-gray-700">{stat.icon}</span>
                <span className={`text-2xl font-black ${stat.color}`}>{stat.val}</span>
             </div>
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-dark p-8 rounded-[40px] border border-white/5">
           <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-icons-round text-purple-400">trending_up</span>
              Flow Progression
           </h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E1428', borderRadius: '16px', border: '1px solid #ffffff10', color: '#fff' }}
                    itemStyle={{ color: '#8b5cf6' }}
                  />
                  <Area type="monotone" dataKey="flow" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorFlow)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="glass-dark p-8 rounded-[40px] border border-white/5">
           <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-icons-round text-blue-400">bar_chart</span>
              Rhyme Density
           </h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#ffffff05'}}
                    contentStyle={{ backgroundColor: '#1E1428', borderRadius: '16px', border: '1px solid #ffffff10', color: '#fff' }}
                  />
                  <Bar dataKey="rhymes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
