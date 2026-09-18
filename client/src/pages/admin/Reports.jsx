import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function Reports() {
  const data = [
    { name: 'Aug', rev: 4000 },
    { name: 'Sep', rev: 3000 },
    { name: 'Oct', rev: 2000 },
    { name: 'Nov', rev: 2780 },
    { name: 'Dec', rev: 1890 },
    { name: 'Jan', rev: 2390 },
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Reports & Analytics</h1>
      <div className="card mb-8">
        <h2 className="font-bold mb-6 text-lg">Revenue (Last 6 Months)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} />
              <Tooltip formatter={v => [`₱${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="rev" stroke="#f4c430" strokeWidth={3} dot={{ fill: '#1a237e', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}