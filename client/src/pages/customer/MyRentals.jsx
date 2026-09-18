import { useState } from 'react';
export default function MyRentals() {
  const [tab, setTab] = useState('All');
  const tabs = ['All', 'Pending', 'Approved', 'Active', 'Completed'];
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">My Rentals</h1>
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap px-4 py-2 font-semibold ${tab === t ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div className="card flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-gray-200 rounded"></div>
            <div>
              <h3 className="font-bold">Sony A7III Camera</h3>
              <p className="text-sm text-gray-500">Jan 15 - Jan 18 (3 days)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">₱4,500</p>
            <span className="badge-completed mt-1">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}