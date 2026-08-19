import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/getInitials';

function Icon({ children }) {
  return (
    <span className="sidebar__icon" aria-hidden="true">
      {children}
    </span>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">CA</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">CodeAlpha</span>
          <span className="sidebar__brand-tagline">Project Management</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <NavLink to="/" end className="sidebar__link">
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </Icon>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/projects" className="sidebar__link">
          <Icon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </Icon>
          <span>Projects</span>
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{getInitials(user?.name)}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">
              {user ? user.name : 'Guest User'}
            </span>
            <span className="sidebar__user-role">
              {user ? user.email : 'Not signed in'}
            </span>
          </div>
        </div>

        <div className="sidebar__auth-links">
          {!user ? (
            <>
              <NavLink to="/login" className="sidebar__link sidebar__link--compact">
                <Icon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </Icon>
                <span>Login</span>
              </NavLink>

              <NavLink to="/register" className="sidebar__link sidebar__link--compact">
                <Icon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </Icon>
                <span>Register</span>
              </NavLink>
            </>
          ) : (
            <button
              type="button"
              className="sidebar__link sidebar__link--compact sidebar__logout"
              onClick={logout}
            >
              <Icon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </Icon>
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
