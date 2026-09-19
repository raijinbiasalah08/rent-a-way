import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createComplaint } from '../api/admin';
import toast from 'react-hot-toast';

export default function ComplaintModal({ onClose, reportedId = null, context = '' }) {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) return toast.error('Subject is required');
    if (!details.trim()) return toast.error('Details are required');
    setSubmitting(true);
    try {
      await createComplaint({ reported_id: reportedId, subject, details });
      toast.success('Complaint filed successfully. Our team will review it.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-lg text-navy-700">File a Complaint</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {context && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
              <span className="font-medium">Related to:</span> {context}
            </div>
          )}

          <div>
            <label className="label">Subject <span className="text-red-400">*</span></label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Item damaged, Late return, False listing..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="label">Details <span className="text-red-400">*</span></label>
            <textarea
              className="input h-32 resize-none"
              placeholder="Please describe the issue in detail..."
              value={details}
              onChange={e => setDetails(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-gray-400">
            Our admin team will review your complaint within 24–48 hours. Thank you for helping keep RentAway safe.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
