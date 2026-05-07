import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-10 flex flex-col items-center gap-4">
          <Logo />
          <h1 className="text-3xl font-bold text-white">Create an account</h1>
          <p className="text-gray-400">Start managing projects with AI</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/50 bg-red-900/30 p-4 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-purple-400/70"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { y: -1 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full rounded-xl bg-linear-to-r from-purple-600 to-purple-900 py-3 font-semibold text-white shadow-lg shadow-purple-500/20 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
