import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

export const AuthView = ({ onAuthSuccess }) => {
  const { login, register, authError, setAuthError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleFillDemoInspector = () => {
    setEmail('inspector@legalmetri.gov.in');
    setPassword('Password@123');
    setFormError('');
    if (setAuthError) setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (setAuthError) setAuthError(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setFormError('Please enter your full name and designation.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setFormError('Please enter a valid official email address.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match. Please verify.');
        return;
      }

      setSubmitting(true);
      try {
        await register({ name, email, password, confirmPassword });
        if (onAuthSuccess) onAuthSuccess();
      } catch (err) {
        setFormError(err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      // Login
      if (!email.trim() || !password) {
        setFormError('Please enter both email and password.');
        return;
      }

      setSubmitting(true);
      try {
        await login(email, password);
        if (onAuthSuccess) onAuthSuccess();
      } catch (err) {
        setFormError(err.message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const displayError = formError || authError;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Subtle Tech Grid & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Department / System Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-blue-400 stroke-[2]" />
          </div>
          <Logo variant="dark" size="lg" />
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Legal Metrology (Packaged Commodities) Verification Portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all">
          {/* Tabs: Sign In / Register */}
          <div className="grid grid-cols-2 bg-slate-100/80 p-1 border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFormError('');
              }}
              className={`py-2.5 rounded-xl transition-all text-center ${
                mode === 'login'
                  ? 'bg-white text-[#0B1B2B] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inspector Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setFormError('');
              }}
              className={`py-2.5 rounded-xl transition-all text-center ${
                mode === 'register'
                  ? 'bg-white text-[#0B1B2B] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register Officer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            {/* Error Banner */}
            {displayError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{displayError}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name & Designation
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Officer R. Sharma"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inspector@legalmetri.gov.in"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Quick Demo Credentials Helper */}
            {mode === 'login' && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleFillDemoInspector}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <span>Use Demo Inspector Credentials</span>
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0B1B2B] hover:bg-[#152a42] text-white text-xs font-semibold shadow-md shadow-[#0B1B2B]/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Authenticate & Enter' : 'Create Inspector Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS / JWT Encrypted</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">SIH-2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
