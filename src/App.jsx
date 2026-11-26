
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Compass, LayoutDashboard, CheckSquare, BookOpen, Library,
  NotebookPen, CalendarDays, Repeat, Settings, Menu, X,
  RefreshCw, LogOut, Mail, Lock, UserPlus, LogIn,
  Plus, Pencil, Trash2, Check, Clock, Save
} from 'lucide-react';

import { getDashboardData } from './lib/dashboard.js';
import {
  signIn, signUp, signOut, getCurrentUser, onAuthStateChange
} from './lib/auth.js';

import {
  getMyTasks, createTask, updateTask, deleteTask
} from './lib/tasks.js';

import {
  getMySubjects, createSubject, updateSubject, deleteSubject
} from './lib/subjects.js';

import {
  getMyBooks, createBook, updateBook, deleteBook
} from './lib/books.js';

import {
  getMyNotebooks, createNotebook, updateNotebook, deleteNotebook
} from './lib/notebooks.js';

import {
  getMyHabits, createHabit, updateHabit, deleteHabit,
  getHabitLogs, logHabitCompletion, deleteHabitLog
} from './lib/habits.js';

import {
  getMyEvents, createEvent, updateEvent, deleteEvent
} from './lib/calendarEvents.js';

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

const SECTION_CONFIG = {
  tasks: {
    title: 'Tasks',
    singular: 'task',
    load: getMyTasks,
    create: createTask,
    update: updateTask,
    remove: deleteTask,
    key: 'tasks',
    fields: [
      { name: 'title', label: 'Task title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'due_date', label: 'Due date', type: 'date' },
      {
        name: 'priority', label: 'Priority', type: 'select',
        options: [
          ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']
        ]
      },
      {
        name: 'status', label: 'Status', type: 'select',
        options: [
          ['todo', 'To do'],
          ['in_progress', 'In progress'],
          ['completed', 'Completed']
        ]
      }
    ],
    defaults: {
      title: '', description: '', due_date: '',
      priority: 'medium', status: 'todo'
    }
  },

  subjects: {
    title: 'Subjects',
    singular: 'subject',
    load: getMySubjects,
    create: createSubject,
    update: updateSubject,
    remove: deleteSubject,
    key: 'subjects',
    fields: [
      { name: 'name', label: 'Subject name', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'color', label: 'Color', type: 'color' }
    ],
    defaults: { name: '', description: '', color: '#64748b' }
  },

  books: {
    title: 'Books',
    singular: 'book',
    load: getMyBooks,
    create: createBook,
    update: updateBook,
    remove: deleteBook,
    key: 'books',
    fields: [
      { name: 'title', label: 'Book title', required: true },
      { name: 'author', label: 'Author' },
      { name: 'description', label: 'Description', type: 'textarea' },
      {
        name: 'status', label: 'Reading status', type: 'select',
        options: [
          ['to_read', 'To read'],
          ['reading', 'Reading'],
          ['completed', 'Completed'],
          ['on_hold', 'On hold']
        ]
      }
    ],
    defaults: {
      title: '', author: '', description: '', status: 'to_read'
    }
  },

  notebook: {
    title: 'Notebook',
    singular: 'notebook',
    load: getMyNotebooks,
    create: createNotebook,
    update: updateNotebook,
    remove: deleteNotebook,
    key: 'notebooks',
    fields: [
      { name: 'title', label: 'Notebook title', required: true }
    ],
    defaults: { title: '' }
  },

  habits: {
    title: 'Habits',
    singular: 'habit',
    load: getMyHabits,
    create: createHabit,
    update: updateHabit,
    remove: deleteHabit,
    key: 'habits',
    fields: [
      { name: 'name', label: 'Habit name', required: true },
      {
        name: 'frequency', label: 'Frequency', type: 'select',
        options: [
          ['daily', 'Daily'],
          ['weekly', 'Weekly'],
          ['custom', 'Custom']
        ]
      }
    ],
    defaults: { name: '', frequency: 'daily' }
  },

  calendar: {
    title: 'Calendar',
    singular: 'event',
    load: getMyEvents,
    create: createEvent,
    update: updateEvent,
    remove: deleteEvent,
    key: 'events',
    fields: [
      { name: 'title', label: 'Event title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'start_at', label: 'Start date and time', type: 'datetime-local', required: true },
      { name: 'end_at', label: 'End date and time', type: 'datetime-local', required: true }
    ],
    defaults: {
      title: '', description: '', start_at: '', end_at: ''
    }
  }
};

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalDateTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

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

      if (result.error) throw result.error;

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
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-icon"><Compass size={28} /></div>
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
              onChange={e => setEmail(e.target.value)}
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
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
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

function Field({ field, value, onChange }) {
  const common = {
    id: field.name,
    name: field.name,
    value: value ?? '',
    required: Boolean(field.required),
    onChange: event => onChange(field.name, event.target.value)
  };

  if (field.type === 'textarea') {
    return (
      <label className="workspace-field" htmlFor={field.name}>
        {field.label}
        <textarea {...common} rows={3} />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="workspace-field" htmlFor={field.name}>
        {field.label}
        <select {...common}>
          {field.options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>{label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="workspace-field" htmlFor={field.name}>
      {field.label}
      <input
        {...common}
        type={field.type || 'text'}
      />
    </label>
  );
}

function WorkspaceSection({ type }) {
  const config = SECTION_CONFIG[type];

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(config.defaults);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [habitLogs, setHabitLogs] = useState({});
  const [expandedHabit, setExpandedHabit] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await config.load();

      if (result?.error) throw result.error;

      setItems(result?.[config.key] || []);
    } catch (err) {
      setError(err?.message || `Could not load ${config.title}.`);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    setItems([]);
    setForm(config.defaults);
    setEditingId(null);
    loadItems();
  }, [loadItems, config]);

  function changeField(name, value) {
    setForm(previous => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(config.defaults);
    setEditingId(null);
  }

  function startEditing(item) {
    const next = {};

    config.fields.forEach(field => {
      let value = item[field.name] ?? config.defaults[field.name] ?? '';

      if (field.type === 'datetime-local') {
        value = toLocalDateTime(value);
      } else if (field.type === 'date' && value) {
        value = String(value).slice(0, 10);
      }

      next[field.name] = value;
    });

    setForm(next);
    setEditingId(item.id);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getFormData() {
    const data = { ...form };

    if (type === 'calendar') {
      const start = new Date(data.start_at);
      const end = new Date(data.end_at);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        throw new Error('Please enter valid event dates.');
      }

      if (end <= start) {
        throw new Error('The end time must be after the start time.');
      }

      data.start_at = start.toISOString();
      data.end_at = end.toISOString();
    }

    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = getFormData();

      const result = editingId
        ? await config.update(editingId, data)
        : await config.create(data);

      if (result?.error) throw result.error;

      setMessage(editingId ? 'Changes saved successfully.' : 'Added successfully.');
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err?.message || 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title || item.name}"?`)) return;

    setError('');
    setMessage('');

    try {
      const result = await config.remove(item.id);
      if (result?.error) throw result.error;

      setMessage('Deleted successfully.');
      if (editingId === item.id) resetForm();
      await loadItems();
    } catch (err) {
      setError(err?.message || 'Could not delete this item.');
    }
  }

  async function updateItem(item, updates) {
    setError('');
    setMessage('');

    try {
      const result = await config.update(item.id, updates);
      if (result?.error) throw result.error;

      setMessage('Updated successfully.');
      await loadItems();
    } catch (err) {
      setError(err?.message || 'Could not update this item.');
    }
  }

  async function recordHabit(item) {
    setError('');
    setMessage('');

    try {
      const result = await logHabitCompletion(item.id, getLocalDate());
      if (result?.error) throw result.error;

      setMessage(result?.alreadyLogged
        ? 'This habit is already recorded for today.'
        : 'Habit completion recorded.');

      await loadHabitHistory(item.id);
    } catch (err) {
      setError(err?.message || 'Could not record this habit.');
    }
  }

  async function loadHabitHistory(habitId) {
    try {
      const result = await getHabitLogs(habitId);
      if (result?.error) throw result.error;

      setHabitLogs(previous => ({
        ...previous,
        [habitId]: result?.logs || []
      }));
    } catch (err) {
      setError(err?.message || 'Could not load habit history.');
    }
  }

  async function toggleHabitHistory(habitId) {
    if (expandedHabit === habitId) {
      setExpandedHabit(null);
      return;
    }

    setExpandedHabit(habitId);
    await loadHabitHistory(habitId);
  }

  async function removeHabitLog(logId, habitId) {
    try {
      const result = await deleteHabitLog(logId);
      if (result?.error) throw result.error;

      await loadHabitHistory(habitId);
      setMessage('Habit record deleted.');
    } catch (err) {
      setError(err?.message || 'Could not delete habit record.');
    }
  }

  function renderItem(item) {
    const name = item.title || item.name || 'Untitled';
    const description = item.description;

    return (
      <article className="workspace-item" key={item.id}>
        <div className="workspace-item-content">
          <h3>{name}</h3>

          {description && <p>{description}</p>}

          {type === 'tasks' && (
            <div className="workspace-meta">
              <span>{item.priority || 'medium'} priority</span>
              {item.due_date && <span>Due: {formatDate(item.due_date)}</span>}
              <span>{item.status || 'todo'}</span>
            </div>
          )}

          {type === 'subjects' && item.color && (
            <span className="workspace-color">
              <span
                className="workspace-color-dot"
                style={{ backgroundColor: item.color }}
              />
              {item.color}
            </span>
          )}

          {type === 'books' && (
            <div className="workspace-meta">
              {item.author && <span>By {item.author}</span>}
              <span>{item.status?.replaceAll('_', ' ') || 'to read'}</span>
            </div>
          )}

          {type === 'habits' && (
            <>
              <div className="workspace-meta">
                <span>{item.frequency || 'daily'}</span>
              </div>

              <div className="workspace-actions">
                <button type="button" onClick={() => recordHabit(item)}>
                  <Check size={16} /> Done today
                </button>

                <button
                  type="button"
                  onClick={() => toggleHabitHistory(item.id)}
                >
                  <Clock size={16} /> History
                </button>
              </div>

              {expandedHabit === item.id && (
                <div className="habit-history">
                  <strong>Completion history</strong>

                  {(habitLogs[item.id] || []).length === 0 && (
                    <p>No records yet.</p>
                  )}

                  {(habitLogs[item.id] || []).map(log => (
                    <div className="habit-log" key={log.id}>
                      <span>{log.completed_on}</span>
                      <button
                        type="button"
                        onClick={() => removeHabitLog(log.id, item.id)}
                        aria-label="Delete habit record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {type === 'calendar' && (
            <div className="workspace-meta">
              <span>Start: {formatDate(item.start_at)}</span>
              <span>End: {formatDate(item.end_at)}</span>
              <span>{item.status || 'scheduled'}</span>
            </div>
          )}
        </div>

        <div className="workspace-actions">
          {type === 'books' && (
            <button
              type="button"
              onClick={() => {
                const statuses = ['to_read', 'reading', 'completed', 'on_hold'];
                const current = statuses.indexOf(item.status);
                const next = statuses[(current + 1) % statuses.length];
                updateItem(item, { status: next });
              }}
            >
              Change status
            </button>
          )}

          {type === 'tasks' && (
            <button
              type="button"
              onClick={() => {
                const statuses = ['todo', 'in_progress', 'completed'];
                const current = statuses.indexOf(item.status);
                const next = statuses[(current + 1) % statuses.length];
                updateItem(item, { status: next });
              }}
            >
              Change status
            </button>
          )}

          {type === 'calendar' && (
            <button
              type="button"
              onClick={() => updateItem(item, {
                status: item.status === 'completed' ? 'scheduled' : 'completed'
              })}
            >
              {item.status === 'completed' ? 'Reopen' : 'Complete'}
            </button>
          )}

          <button type="button" onClick={() => startEditing(item)}>
            <Pencil size={16} /> Edit
          </button>

          <button
            type="button"
            className="danger-action"
            onClick={() => handleDelete(item)}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="workspace-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>{config.title}</h1>
          <p>Organize and manage your {config.title.toLowerCase()}.</p>
        </div>

        <button type="button" onClick={loadItems} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p className="workspace-error" role="alert">{error}</p>}
      {message && <p className="workspace-message" role="status">{message}</p>}

      <form className="workspace-form" onSubmit={handleSubmit}>
        <h2>{editingId ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2>

        {config.fields.map(field => (
          <Field
            key={field.name}
            field={field}
            value={form[field.name]}
            onChange={changeField}
          />
        ))}

        <div className="workspace-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add'}
            {editingId ? <Save size={16} /> : <Plus size={16} />}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="workspace-list-heading">
        <h2>Your {config.title}</h2>
        <span>{items.length} items</span>
      </div>

      {loading ? (
        <p role="status">Loading {config.title.toLowerCase()}...</p>
      ) : items.length === 0 ? (
        <div className="workspace-empty">
          <div className="section-icon">
            {type === 'tasks' && <CheckSquare size={28} />}
            {type === 'subjects' && <BookOpen size={28} />}
            {type === 'books' && <Library size={28} />}
            {type === 'notebook' && <NotebookPen size={28} />}
            {type === 'habits' && <Repeat size={28} />}
            {type === 'calendar' && <CalendarDays size={28} />}
          </div>
          <h3>No {config.title.toLowerCase()} yet</h3>
          <p>Add your first {config.singular} using the form above.</p>
        </div>
      ) : (
        <div className="workspace-list">
          {items.map(renderItem)}
        </div>
      )}
    </div>
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

  const currentPage = navigation.find(item => item.id === activePage);

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

      setAuthError(error?.message || 'Could not verify your account.');
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

      if (!mounted.current || currentRequest !== requestId.current) return;

      if (!result?.data) {
        throw result?.error || new Error('Dashboard data could not be loaded.');
      }

      setDashboard(result.data);
      setSectionErrors(result.errors || []);
    } catch (error) {
      if (!mounted.current || currentRequest !== requestId.current) return;

      console.error('Dashboard loading failed:', error);
      setLoadError('Unable to load dashboard data. Check your connection and try again.');
    } finally {
      if (mounted.current && currentRequest === requestId.current) {
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
      if (result.error) throw result.error;
    } catch (error) {
      setAuthError(error?.message || 'Could not sign out. Please try again.');
    } finally {
      if (mounted.current) setSigningOut(false);
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
        {authError && <p className="auth-error" role="alert">{authError}</p>}
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
      icon: CheckSquare,
      page: 'tasks'
    },
    {
      label: 'Subjects',
      value: summary.subjects.total,
      detail: 'Your study subjects',
      icon: BookOpen,
      page: 'subjects'
    },
    {
      label: 'Books',
      value: summary.books.total,
      detail: 'In your reading list',
      icon: Library,
      page: 'books'
    },
    {
      label: 'Habits',
      value: summary.habits.total,
      detail: 'Your tracked habits',
      icon: Repeat,
      page: 'habits'
    },
    {
      label: 'Events',
      value: summary.calendar.total,
      detail: `${summary.calendar.today} today`,
      icon: CalendarDays,
      page: 'calendar'
    }
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Compass size={24} /></div>

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
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
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
            <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
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
          {authError && <p role="alert">{authError}</p>}

          {activePage === 'dashboard' ? (
            <>
              <div className="welcome-section">
                <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
                <h1>Find your direction.</h1>
                <p>
                  One place to organize your studies, reading,
                  habits and everyday life.
                </p>
              </div>

              {loading && <p role="status">Loading your workspace data...</p>}

              {loadError && (
                <div role="alert">
                  <p>{loadError}</p>
                  <button type="button" onClick={loadDashboard} disabled={loading}>
                    <RefreshCw size={16} /> Try again
                  </button>
                </div>
              )}

              {sectionErrors.length > 0 && (
                <div role="alert">
                  <p>Some sections could not be loaded:</p>
                  <ul>
                    {sectionErrors.map((item, index) => (
                      <li key={`${item.section}-${index}`}>{item.section}</li>
                    ))}
                  </ul>
                  <button type="button" onClick={loadDashboard} disabled={loading}>
                    Retry loading
                  </button>
                </div>
              )}

              <div className="dashboard-grid">
                <div className="welcome-card">
                  <span className="card-kicker">DAILY COMPASS</span>
                  <h2>A clearer way to organize your day.</h2>
                  <p>
                    Your personal space for planning, learning
                    and keeping track of what matters.
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
                    <button
                      className="quick-card dashboard-stat-card"
                      key={card.label}
                      type="button"
                      onClick={() => setActivePage(card.page)}
                    >
                      <Icon size={22} />
                      <h3>{card.label}</h3>
                      <strong>{loading && !dashboard ? '—' : card.value}</strong>
                      <p>{card.detail}</p>
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={loadDashboard} disabled={loading}>
                <RefreshCw size={16} /> Refresh dashboard
              </button>
            </>
          ) : (
            <WorkspaceSection key={activePage} type={activePage} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
