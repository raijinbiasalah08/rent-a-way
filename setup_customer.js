const fs = require('fs');
const path = require('path');
const clientDir = path.join(__dirname, 'client');

const files = {
  'src/pages/customer/Dashboard.jsx': `export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Welcome back, John!</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center"><div className="text-3xl font-bold text-navy-700">12</div><div className="text-sm text-gray-500">Total Rentals</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-green-600">2</div><div className="text-sm text-gray-500">Active Rentals</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-gray-700">9</div><div className="text-sm text-gray-500">Completed</div></div>
        <div className="card text-center"><div className="text-3xl font-bold text-yellow-600">1</div><div className="text-sm text-gray-500">Pending</div></div>
      </div>
      <h2 className="text-xl font-bold mb-4">Active Rentals</h2>
      <div className="card">
        <p className="text-gray-500 text-sm">You have no active rentals at the moment.</p>
      </div>
    </div>
  );
}`,
  'src/pages/customer/MyRentals.jsx': `import { useState } from 'react';
export default function MyRentals() {
  const [tab, setTab] = useState('All');
  const tabs = ['All', 'Pending', 'Approved', 'Active', 'Completed'];
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">My Rentals</h1>
      <div className="flex gap-4 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={\`whitespace-nowrap px-4 py-2 font-semibold \${tab === t ? 'text-navy-700 border-b-2 border-navy-700' : 'text-gray-500'}\`}>
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
}`,
  'src/pages/customer/Booking.jsx': `import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaymentModal from '../../components/PaymentModal';

export default function Booking() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Complete Your Booking</h1>
      <div className="card space-y-6">
        <div className="flex gap-4">
          <div className="w-24 h-24 bg-gray-200 rounded"></div>
          <div>
            <h2 className="text-xl font-bold">Sony A7III Camera</h2>
            <p className="text-gray-500">₱1,500 / day</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Start Date</label><input type="date" className="input" /></div>
          <div><label className="label">End Date</label><input type="date" className="input" /></div>
        </div>
        <div>
          <label className="label">Notes to Supplier</label>
          <textarea className="input h-24" placeholder="Any special requests?"></textarea>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between font-bold text-xl mb-4">
            <span>Total</span>
            <span>₱4,500</span>
          </div>
          <button onClick={() => setShowPayment(true)} className="btn-primary w-full">Confirm & Pay</button>
        </div>
      </div>
      {showPayment && (
        <PaymentModal 
          rental={{ id: 1, total_price: 4500 }} 
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); navigate('/customer/rentals'); }} 
        />
      )}
    </div>
  );
}`,
  'src/pages/customer/Profile.jsx': `export default function Profile() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Profile Settings</h1>
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-navy-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">JD</div>
          <button className="text-sm btn-outline py-1.5 px-3">Change Picture</button>
        </div>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name</label><input type="text" className="input" defaultValue="John" /></div>
            <div><label className="label">Last Name</label><input type="text" className="input" defaultValue="Doe" /></div>
          </div>
          <div><label className="label">Phone</label><input type="text" className="input" defaultValue="0917-123-4567" /></div>
          <div><label className="label">Address</label><textarea className="input"></textarea></div>
          <button className="btn-primary">Save Changes</button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Change Password</h2>
        <form className="space-y-4">
          <div><label className="label">Current Password</label><input type="password" className="input" /></div>
          <div><label className="label">New Password</label><input type="password" className="input" /></div>
          <button className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}`,
  'src/pages/customer/Community.jsx': `export default function Community() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-navy-700">Community</h1>
      <div className="card mb-8">
        <textarea className="input mb-3" placeholder="Share your rental experience or ask a question..."></textarea>
        <div className="flex justify-between items-center">
          <select className="input w-auto text-sm py-1.5"><option>Experience</option><option>Question</option></select>
          <button className="btn-primary py-1.5 px-6">Post</button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center font-bold">AS</div>
            <div>
              <p className="font-bold text-sm">Alice Smith</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
            <span className="badge bg-purple-100 text-purple-800 ml-auto">Experience</span>
          </div>
          <p className="text-sm">Rented a camping tent last weekend and it was amazing! Highly recommend checking out outdoor gears here before buying.</p>
        </div>
      </div>
    </div>
  );
}`
};

Object.keys(files).forEach(file => {
  const fullPath = path.join(clientDir, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, files[file]);
});
console.log('Customer pages created.');
