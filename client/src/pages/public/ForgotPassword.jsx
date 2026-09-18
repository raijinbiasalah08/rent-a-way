import { Link } from 'react-router-dom';
export default function ForgotPassword() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-navy-700 mb-4">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you instructions.</p>
        <input type="email" placeholder="Email address" className="input mb-4" />
        <button className="btn-primary w-full">Send Instructions</button>
        <Link to="/login" className="block text-sm text-navy-600 mt-6 hover:underline">Back to Login</Link>
      </div>
    </div>
  );
}