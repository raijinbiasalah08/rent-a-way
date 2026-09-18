export default function Community() {
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
}