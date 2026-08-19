import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import TaskDetails from './pages/TaskDetails';
import NotFound from './pages/NotFound';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Navbar />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/tasks/:id" element={<TaskDetails />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
