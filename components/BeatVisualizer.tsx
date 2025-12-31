
import React, { useEffect, useState } from 'react';

interface Props {
  active: boolean;
}

const BeatVisualizer: React.FC<Props> = ({ active }) => {
  const [bars, setBars] = useState<number[]>(new Array(16).fill(5));

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setBars(new Array(16).fill(0).map(() => Math.floor(Math.random() * 80) + 20));
    }, 120);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-end justify-center gap-1 h-20 w-full px-2">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-purple-600 via-indigo-400 to-blue-300 rounded-t-sm transition-all duration-100 ease-in-out"
          style={{ height: `${h}%`, opacity: (i / 16) + 0.3 }}
        ></div>
      ))}
    </div>
  );
};

export default BeatVisualizer;
