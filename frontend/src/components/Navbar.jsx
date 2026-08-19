import { useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

const pageTitles = {
  '/': 'Dashboard',
  '/projects': 'Projects',
};

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/projects/')) return 'Project Board';
  if (pathname.startsWith('/tasks/')) return 'Task Details';
  return 'CodeAlpha';
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = getPageTitle(pathname);

  function handleNewProject() {
    navigate('/projects', { state: { openCreate: true } });
  }

  return (
    <header className="navbar">
      <div className="navbar__left">
        <h1 className="navbar__title">{title}</h1>
      </div>
      <div className="navbar__right">
        <GlobalSearch />
        <NotificationBell />
        <button
          type="button"
          className="btn btn--primary btn--sm navbar__action"
          onClick={handleNewProject}
        >
          New Project
        </button>
      </div>
    </header>
  );
}
