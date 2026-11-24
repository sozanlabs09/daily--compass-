
import React, { useState } from 'react';
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
  X
} from 'lucide-react';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'books', label: 'Books', icon: Library },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays }
];

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = navigation.find(
    (item) => item.id === activePage
  );

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
          {navigation.map((item) => {
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
          <button className="nav-item">
            <Settings size={19} />
            <span>Settings</span>
          </button>
          <div className="plan-label">
            <span>FREE PLAN</span>
            <small>Upgrade when you're ready</small>
          </div>
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
          {activePage === 'dashboard' ? (
            <>
              <div className="welcome-section">
                <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
                <h1>Find your direction.</h1>
                <p>
                  One place to organize your studies,
                  reading, habits and everyday life.
                </p>
              </div>

              <div className="dashboard-grid">
                <div className="welcome-card">
                  <span className="card-kicker">DAILY COMPASS</span>
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
                    Choose a section from the navigation
                    to explore your workspace.
                  </p>
                  <span>7 sections available</span>
                </div>
              </div>
            </>
          ) : (
            <div className="section-placeholder">
              <div className="section-icon">
                {currentPage && (
                  <currentPage.icon size={30} />
                )}
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
