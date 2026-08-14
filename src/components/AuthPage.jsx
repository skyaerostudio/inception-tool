import React, { useState } from 'react';
import { 
  Calendar, 
  Award, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { signIn, signUp, authError, setAuthError, isCloudAuth } = useAuth();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAuthError(null);
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage('');

    if (!email || !password) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    if (activeTab === 'register') {
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (activeTab === 'login') {
        await signIn({ email, password });
      } else {
        const result = await signUp({ email, password, fullName });
        if (result.requiresConfirmation) {
          setSuccessMessage(
            'Registration successful! Please check your email inbox to confirm your email before logging in.'
          );
        } else {
          setSuccessMessage('Account created successfully! Logging you in...');
        }
      }
    } catch (err) {
      // Error is caught and stored in authError state inside context, but fallback here
      if (!authError) {
        setAuthError(err.message || 'An authentication error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header Badge & Brand */}
        <div className="auth-header">
          <div className="pegadaian-brand-badge">
            <Award size={16} className="pegadaian-badge-icon" />
            <span>PT PEGADAIAN (PERSERO)</span>
          </div>

          <div className="auth-logo">
            <Calendar size={36} className="logo-icon text-gold" />
            <h1>Inception Planner</h1>
          </div>
          
          <p className="auth-subtitle">
            Sign in to access the Official Project Schedule & Timeline System
          </p>

          {!isCloudAuth && (
            <div className="auth-notice-badge">
              <ShieldCheck size={14} />
              <span>Offline / Local Mode Active</span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            <LogIn size={18} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabChange('register')}
          >
            <UserPlus size={18} />
            <span>Register</span>
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="auth-alert auth-alert-error">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="auth-alert auth-alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {activeTab === 'register' && (
            <div className="auth-input-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="email">Email Address *</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                required
                placeholder="name@pegadaian.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password *</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <div className="auth-input-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spinner-icon" />
                <span>{activeTab === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                {activeTab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                <span>{activeTab === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {activeTab === 'login' ? "Don't have an account yet?" : 'Already have an account?'}
            {' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => handleTabChange(activeTab === 'login' ? 'register' : 'login')}
            >
              {activeTab === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
