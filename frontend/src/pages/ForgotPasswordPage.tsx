import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
          <h1 className="text-3xl font-bold text-white">Reset your password</h1>
          <p className="text-center text-gray-400">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-green-500/40 bg-green-900/20 p-5 text-center"
          >
            <p className="text-sm text-green-300">
              If an account exists for this email, a reset link has been sent.
            </p>
            <p className="mt-1 text-xs text-gray-500">Check your spam folder if you don't see it.</p>
          </motion.div>
        ) : (
          <>
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
                    Sending…
                  </span>
                ) : (
                  'Send reset link'
                )}
              </motion.button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
