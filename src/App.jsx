
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Compass,
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Library,
  NotebookPen,
  CalendarDays,
  Repeat,
  Settings,
  Menu,
  X,
  RefreshCw,
  LogOut,
  Mail,
  Lock,
  UserPlus,
  LogIn
} from 'lucide-react';

import { getDashboardData } from './lib/dashboard.js';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChange
} from './lib/auth.js';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'books', label: 'Books', icon: Library },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays }
];

const EMPTY_SUMMARY = {
  tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
  subjects: { total: 0 },
  books: { total: 0 },
  habits: { total: 0 },
  calendar: { total: 0, today: 0, upcoming: 0 }
};

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.error) {
        throw result.error;
      }

      if (!isLogin && !result.session) {
        setMessage(
          'Your account was created. Check your email to confirm your address, then sign in.'
        );
        setPassword('');
        return;
      }

      if (!result.user) {
        throw new Error('Authentication could not be completed.');
      }
    } catch (err) {
      setError(
        err?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-icon">
          <Compass size={28} />
        </div>

        <h1>Daily Compass</h1>

        <p className="auth-subtitle">
          {isLogin
            ? 'Welcome back. Sign in to your workspace.'
            : 'Create your account and start organizing your day.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email address</label>

          <div className="auth-input">
            <Mail size={18} />
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              maxLength={254}
              required
              disabled={busy}
            />
          </div>

          <label htmlFor="auth-password">Password</label>

          <div className="auth-input">
            <Lock size={18} />
            <input
              id="auth-password"
              type="password"
              autoComplete={
                isLogin ? 'current-password' : 'new-password'
              }
              placeholder="Enter your password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              disabled={busy}
            />
          </div>

          {error && (
            <p className="auth-error" role="alert">{error}</p>
          )}

          {message && (
            <p className="auth-message" role="status">{message}</p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? 'Please wait...'
              : isLogin
                ? 'Sign in'
                : 'Create account'}

            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin
            ? "Don't have an account?"
            : 'Already have an account?'}
          {' '}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'signup' : 'login');
              setError('');
              setMessage('');
              setPassword('');
            }}
            disabled={busy}
          >
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sectionErrors, setSectionErrors] = useState([]);
  const [signingOut, setSigningOut] = useState(false);

  const requestId = useRef(0);
  const mounted = useRef(false);
  const authEventReceived = useRef(false);

  const currentPage = navigation.find(
    item => item.id === activePage
  );

  useEffect(() => {
    mounted.current = true;
    authEventReceived.current = false;

    const authListener = onAuthStateChange(({ user: nextUser }) => {
      if (!mounted.current) return;

      authEventReceived.current = true;
      setUser(nextUser);
      setAuthError('');
      setAuthLoading(false);
    });

    if (authListener.error) {
      setAuthError(authListener.error.message);
      setAuthLoading(false);
    }

    getCurrentUser().then(result => {
      if (!mounted.current || authEventReceived.current) return;

      if (result.error) {
        setAuthError(result.error.message);
        setUser(null);
      } else {
        setUser(result.user);
        setAuthError('');
      }

      setAuthLoading(false);
    }).catch(error => {
      if (!mounted.current || authEventReceived.current) return;

      setAuthError(
        error?.message || 'Could not verify your account.'
      );
      setUser(null);
      setAuthLoading(false);
    });

    return () => {
      mounted.current = false;
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;

    setLoading(true);
    setLoadError('');
    setSectionErrors([]);

    try {
      const result = await getDashboardData();

      if (!mounted.current || currentRequest !== requestId.current) {
        return;
      }

      if (!result?.data) {
        throw result?.error ||
          new Error('Dashboard data could not be loaded.');
      }

      setDashboard(result.data);
      setSectionErrors(result.errors || []);
    } catch (error) {
      if (!mounted.current || currentRequest !== requestId.current) {
        return;
      }

      console.error('Dashboard loading failed:', error);

      setLoadError(
        'Unable to load dashboard data. Check your connection and try again.'
      );
    } finally {
      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      requestId.current += 1;
      setDashboard(null);
      setLoading(false);
      setLoadError('');
      setSectionErrors([]);
      return;
    }

    loadDashboard();
  }, [user, loadDashboard]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setAuthError('');

    try {
      const result = await signOut();

      if (result.error) {
        throw result.error;
      }

      // The auth state listener updates the user after successful sign-out.
    } catch (error) {
      setAuthError(
        error?.message || 'Could not sign out. Please try again.'
      );
    } finally {
      if (mounted.current) {
        setSigningOut(false);
      }
    }
  }

  if (authLoading) {
    return (
      <main className="auth-screen">
        <p role="status">Checking your account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        {authError && (
          <p className="auth-error" role="alert">{authError}</p>
        )}
        <AuthScreen />
      </>
    );
  }

  const summary = dashboard?.summary || EMPTY_SUMMARY;

  const dashboardCards = [
    {
      label: 'Tasks',
      value: summary.tasks.total,
      detail: `${summary.tasks.completed} completed`,
      icon: CheckSquare
    },
    {
      label: 'Subjects',
      value: summary.subjects.total,
      detail: 'Your study subjects',
      icon: BookOpen
    },
    {
      label: 'Books',
      value: summary.books.total,
      detail: 'In your reading list',
      icon: Library
    },
    {
      label: 'Habits',
      value: summary.habits.total,
      detail: 'Your tracked habits',
      icon: Repeat
    },
    {
      label: 'Events',
      value: summary.calendar.total,
      detail: `${summary.calendar.today} today`,
      icon: CalendarDays
    }
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Compass size={24} />
          </div>

          <div>
            <h2>Daily Compass</h2>
            <span>Your life, in direction.</span>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? 'active' : ''
                }`}
                onClick={() => {
                  setActivePage(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" type="button">
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="plan-label">
            <span>FREE PLAN</span>
            <small>Upgrade when you're ready</small>
          </div>

          <button
            className="nav-item"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={19} />
            <span>
              {signingOut ? 'Signing out...' : 'Sign out'}
            </span>
          </button>

          <small className="account-email">{user.email}</small>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{currentPage?.label || 'Dashboard'}</strong>
          </div>

          <div className="topbar-plan">FREE</div>
        </header>

        <section className="page-content">
          {authError && (
            <p role="alert">{authError}</p>
          )}

          {activePage === 'dashboard' ? (
            <>
              <div className="welcome-section">
                <span className="eyebrow">
                  YOUR PERSONAL WORKSPACE
                </span>

                <h1>Find your direction.</h1>

                <p>
                  One place to organize your studies,
                  reading, habits and everyday life.
                </p>
              </div>

              {loading && (
                <p role="status">Loading your workspace data...</p>
              )}

              {loadError && (
                <div role="alert">
                  <p>{loadError}</p>

                  <button
                    type="button"
                    onClick={loadDashboard}
                    disabled={loading}
                  >
                    <RefreshCw size={16} />
                    Try again
                  </button>
                </div>
              )}

              {sectionErrors.length > 0 && (
                <div role="alert">
                  <p>Some sections could not be loaded:</p>

                  <ul>
                    {sectionErrors.map((item, index) => (
                      <li key={`${item.section}-${index}`}>
                        {item.section}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={loadDashboard}
                    disabled={loading}
                  >
                    Retry loading
                  </button>
                </div>
              )}

              <div className="dashboard-grid">
                <div className="welcome-card">
                  <span className="card-kicker">
                    DAILY COMPASS
                  </span>

                  <h2>A clearer way to organize your day.</h2>

                  <p>
                    Your personal space for planning,
                    learning and keeping track of what matters.
                  </p>

                  <Compass size={46} />
                </div>

                <div className="quick-card">
                  <h3>Your workspace</h3>

                  <p>
                    {loading
                      ? 'Loading your data...'
                      : dashboard
                        ? 'Your workspace data is ready.'
                        : 'Your workspace data will appear here.'}
                  </p>

                  <span>7 sections available</span>
                </div>
              </div>

              <div className="dashboard-grid">
                {dashboardCards.map(card => {
                  const Icon = card.icon;

                  return (
                    <div className="quick-card" key={card.label}>
                      <Icon size={22} />
                      <h3>{card.label}</h3>

                      <strong>
                        {loading && !dashboard ? '—' : card.value}
                      </strong>

                      <p>{card.detail}</p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh dashboard
              </button>
            </>
          ) : (
            <div className="section-placeholder">
              <div className="section-icon">
                {currentPage && <currentPage.icon size={30} />}
              </div>

              <span className="eyebrow">YOUR WORKSPACE</span>

              <h1>{currentPage?.label}</h1>

              <p>
                This section is being built.
                Its features will be added and tested
                before the application is considered complete.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
