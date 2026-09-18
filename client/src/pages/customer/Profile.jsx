export default function Profile() {
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
}