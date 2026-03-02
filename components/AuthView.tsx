import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseService';

interface AuthViewProps {
  onAuthSuccess: (user: any) => void;
}

type AuthScreen = 'email' | 'password' | 'waitlist' | 'waitlist-pending' | 'waitlist-approved';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [screen, setScreen] = useState<AuthScreen>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Shared state
  const [pendingEmail, setPendingEmail] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSwitchScreen = (newScreen: AuthScreen) => {
    setError(null);
    setScreen(newScreen);
  };

  const handleCheckEmail = async () => {
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPendingEmail(email);

    try {
      const status = await supabaseService.checkEmailStatus(email);
      
      switch (status) {
        case 'has-account':
          setScreen('password');
          break;
        case 'approved':
          setScreen('waitlist-approved');
          break;
        case 'pending':
          setScreen('waitlist-pending');
          break;
        case 'unknown':
        default:
          setScreen('waitlist');
          break;
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { user, error } = await supabaseService.signIn(pendingEmail, password);
      if (error) {
        setError(error);
      } else if (user) {
        onAuthSuccess(user);
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyWaitlist = async () => {
    if (!pendingEmail) {
      setError("Please enter your email.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabaseService.applyToWaitlist(pendingEmail);
      if (error === 'ALREADY_APPLIED') {
        setError("You've already applied — we'll be in touch when you're approved.");
      } else if (error) {
        setError(error);
      } else {
        setScreen('waitlist-pending');
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { user, error } = await supabaseService.signUp(pendingEmail, password, name);
      if (error) {
        setError(error);
      } else if (user) {
        onAuthSuccess(user);
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render helpers
  const renderSpinner = () => (
    <div className="border-t-2 border-white rounded-full w-4 h-4 animate-spin mx-auto"></div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl w-full max-w-md">
        
        {/* EMAIL SCREEN */}
        {screen === 'email' && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-white">Welcome</h1>
              <p className="text-slate-500 text-sm">Enter your email to continue</p>
            </div>
            
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <div className="space-y-4">
              <button 
                onClick={handleCheckEmail}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? renderSpinner() : "Continue"}
              </button>
              
              <div className="text-center">
                <span className="text-slate-500 text-xs mr-1">Don't have access?</span>
                <button 
                  onClick={() => {
                    setPendingEmail(email);
                    handleSwitchScreen('waitlist');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold cursor-pointer underline-offset-2 hover:underline"
                >
                  Apply for early access
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASSWORD SCREEN */}
        {screen === 'password' && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-white">Welcome back</h1>
              <p className="text-slate-500 text-sm">{pendingEmail}</p>
            </div>
            
            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <div className="space-y-4">
              <button 
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? renderSpinner() : "Sign In"}
              </button>
              
              <div className="text-center">
                <button 
                  onClick={() => {
                    setPassword('');
                    handleSwitchScreen('email');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold cursor-pointer underline-offset-2 hover:underline"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WAITLIST SCREEN */}
        {screen === 'waitlist' && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-white">Apply for Early Access</h1>
              <p className="text-slate-500 text-sm">We're in private beta. Drop your email and we'll review your application.</p>
            </div>
            
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Email address"
                value={pendingEmail}
                onChange={(e) => setPendingEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <div className="space-y-4">
              <button 
                onClick={handleApplyWaitlist}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? renderSpinner() : "Apply for Access"}
              </button>
              
              <div className="text-center">
                <button 
                  onClick={() => handleSwitchScreen('email')}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold cursor-pointer underline-offset-2 hover:underline"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WAITLIST PENDING SCREEN */}
        {screen === 'waitlist-pending' && (
          <div className="space-y-8 text-center">
            <div className="text-5xl mb-4">✉️</div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white">You're on the list</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                We'll review your application and reach out when you're approved. Come back and enter your email to check your status.
              </p>
            </div>
            
            <div className="pt-4">
              <button 
                onClick={() => handleSwitchScreen('email')}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-bold cursor-pointer underline-offset-2 hover:underline"
              >
                ← Back to start
              </button>
            </div>
          </div>
        )}

        {/* WAITLIST APPROVED SCREEN */}
        {screen === 'waitlist-approved' && (
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-black text-white">You're approved!</h1>
              <p className="text-slate-500 text-sm">Create your account to get started.</p>
            </div>
            
            <div className="space-y-4">
              <input 
                type="email" 
                value={pendingEmail}
                readOnly
                className="w-full bg-slate-800 opacity-60 border border-slate-700 text-slate-400 px-6 py-5 rounded-2xl cursor-not-allowed font-medium"
              />
              <input 
                type="text" 
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
              <input 
                type="password" 
                placeholder="Create a password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
              <input 
                type="password" 
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}

            <div className="space-y-4">
              <button 
                onClick={handleSignUp}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? renderSpinner() : "Create Account"}
              </button>
              
              <div className="text-center">
                <button 
                  onClick={() => handleSwitchScreen('email')}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-bold cursor-pointer underline-offset-2 hover:underline"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
