
import React from 'react';
import { UserState, AppScreen } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
  userState: UserState;
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
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

const StatsDashboard: React.FC<Props> = ({ userState, currentScreen, onNavigate, onBack }) => {
  const navItems = [
    { id: 'onboarding' as AppScreen, label: 'Home', icon: 'home' },
    { id: 'voice' as AppScreen, label: 'Mic', icon: 'mic' },
    { id: 'studio' as AppScreen, label: 'Studio', icon: 'edit_note' },
    { id: 'stats' as AppScreen, label: 'Vault', icon: 'insights' },
  ];

  return (
    <div className="min-h-screen flex bg-[#0F0F23] overflow-hidden">
      {/* Desktop Navigation Sidebar */}
      <aside className="hidden md:flex w-80 glass-dark border-r border-white/5 p-6 flex-col gap-6 overflow-y-auto custom-scroll">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="material-icons-round text-white text-3xl">insights</span>
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tighter metallic-text font-['Orbitron']">PMP VAULT</h1>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-purple-500/20">
              {userState.genre} INTEL
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 p-2 glass rounded-[2rem] border border-white/5">
           {navItems.map((item) => (
             <button
               key={item.id}
               onClick={() => onNavigate(item.id)}
               className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm ${currentScreen === item.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
             >
               <span className="material-icons-round">{item.icon}</span>
               {item.label}
             </button>
           ))}
        </nav>

        <div className="mt-auto glass-dark p-6 rounded-3xl border border-white/5 text-center">
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic leading-relaxed">
             "The numbers don't lie, but the soul is in the flow."
           </p>
           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 w-2/3"></div>
           </div>
        </div>
      </aside>

      <main className="flex-1 p-8 max-w-5xl mx-auto overflow-y-auto custom-scroll pb-32 md:pb-8 animate-in fade-in zoom-in-95 duration-700">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl font-black metallic-text tracking-tighter">STUDIO ANALYTICS</h2>
            <p className="text-gray-500 uppercase text-xs font-bold tracking-[0.3em] mt-1">Lyrical Intelligence Dashboard</p>
          </div>
          <button 
            onClick={onBack}
            className="hidden md:flex p-4 rounded-2xl glass hover:bg-white/10 transition-all items-center gap-2 font-bold text-sm"
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
      </main>

      {/* Mobile Tab Bar Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-dark border-t border-white/5 px-6 py-4 flex justify-between items-center z-30">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 ${currentScreen === item.id ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <span className="material-icons-round">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default StatsDashboard;
