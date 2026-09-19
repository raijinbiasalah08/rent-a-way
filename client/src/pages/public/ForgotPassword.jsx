import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email');
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setResetToken(res.data?.resetToken);
      toast.success('Reset instructions generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        {!resetToken ? (
          <>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔑</div>
              <h2 className="text-2xl font-bold text-navy-700">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-2">Enter your email and we'll generate a reset token for you.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
            <Link to="/login" className="block text-sm text-navy-600 mt-6 hover:underline text-center">
              ← Back to Login
            </Link>
          </>
        ) : (
          /* Success State */
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-navy-700 mb-2">Reset Token Generated</h2>
            <p className="text-sm text-gray-500 mb-5">
              In production, this would be emailed to you. For now, here is your reset token:
            </p>
            <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 mb-5">
              <p className="text-xs text-gray-400 mb-1">Reset Token</p>
              <p className="font-mono text-sm text-navy-700 break-all font-bold">{resetToken}</p>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Contact your administrator with this token to complete the password reset.
            </p>
            <Link to="/login" className="btn-primary inline-block px-8">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}