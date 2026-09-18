import { useState } from 'react';
export default function RentalRequests() {
  const [tab, setTab] = useState('Pending');
  const tabs = ['Pending', 'Approved', 'Active', 'Completed'];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Rental Requests</h1>
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap px-4 py-2 font-semibold ${tab === t ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>
      <div className="card flex justify-between items-center">
        <div>
          <h3 className="font-bold">Sony A7III requested by John Doe</h3>
          <p className="text-sm text-gray-500">Jan 20 - Jan 22 (3 days) • ₱4,500</p>
        </div>
        {tab === 'Pending' ? (
          <div className="flex gap-2">
            <button className="btn-primary py-1.5 px-4 text-sm">Approve</button>
            <button className="bg-red-100 text-red-600 rounded font-semibold py-1.5 px-4 text-sm">Reject</button>
          </div>
        ) : (
          <span className={`badge-${tab.toLowerCase()}`}>{tab}</span>
        )}
      </div>
    </div>
  );
}