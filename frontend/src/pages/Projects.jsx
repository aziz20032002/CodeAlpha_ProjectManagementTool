import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ProjectFormModal from '../components/ProjectFormModal';
import RoleBadge from '../components/RoleBadge';
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from '../services/projectService';
import { formatDate } from '../utils/formatDate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

function ProjectCardSkeleton() {
  return (
    <article className="project-card project-card--skeleton">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text skeleton--short" />
      <div className="skeleton skeleton--button" />
    </article>
  );
}

function ProjectCard({ project, onEdit, onDelete }) {
  const isOwner = project.role === 'owner';

  return (
    <article className="project-card">
      <div className="project-card__header">
        <h3 className="project-card__title">{project.name}</h3>
        <RoleBadge role={project.role} />
      </div>

      <p className="project-card__description">
        {project.description || 'No description provided.'}
      </p>

      <div className="project-card__meta">
        <span className="project-card__date">
          Created {formatDate(project.created_at)}
        </span>
      </div>

      <div className="project-card__actions">
        <Link
          to={`/projects/${project.id}`}
          className="btn btn--secondary btn--full project-card__action"
        >
          Open Project
        </Link>

        {isOwner && (
          <div className="project-card__owner-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onEdit(project)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--danger-text"
              onClick={() => onDelete(project)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Projects() {
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load projects.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (location.state?.openCreate) {
      setCreateOpen(true);
      navigate('.', { replace: true, state: {} });
    }

    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      if (!normalizedQuery) return true;
      return (
        project.name?.toLowerCase().includes(normalizedQuery) ||
        project.description?.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [projects, searchQuery, sortOrder]);

  async function handleCreate({ name, description }) {
    try {
      const { project } = await createProject({ name, description });
      setProjects((prev) => [{ ...project, role: 'owner' }, ...prev]);
      setCreateOpen(false);
      setSuccessMessage('Project created successfully.');
    } catch (err) {
      throw err;
    }
  }

  async function handleEdit({ name, description }) {
    if (!editProject) return;

    try {
      const { project } = await updateProject(editProject.id, {
        name,
        description,
      });
      setProjects((prev) =>
        prev.map((item) =>
          item.id === editProject.id
            ? { ...item, ...project, role: item.role }
            : item,
        ),
      );
      setEditProject(null);
      setSuccessMessage('Project updated successfully.');
    } catch (err) {
      throw err;
    }
  }

  async function handleDelete() {
    if (!deleteProjectTarget) return;

    await deleteProject(deleteProjectTarget.id);
    setProjects((prev) =>
      prev.filter((item) => item.id !== deleteProjectTarget.id),
    );
    setDeleteProjectTarget(null);
    setSuccessMessage('Project deleted successfully.');
  }

  return (
    <div className="page page--fade-in">
      {successMessage && (
        <div className="page-banner page-banner--success" role="status">
          {successMessage}
        </div>
      )}

      <div className="page-header page-header--row">
        <div>
          <h2 className="page-header__title">My Projects</h2>
          <p className="page-header__subtitle">
            Organize and track all your team projects in one place.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setCreateOpen(true)}
        >
          Create Project
        </button>
      </div>

      {!loading && !error && (
        <div className="filter-toolbar projects-toolbar" aria-label="Project filters">
          <label className="filter-toolbar__search">
            <span className="sr-only">Search projects</span>
            <input
              type="search"
              className="form-input"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label className="filter-toolbar__field">
            <span>Sort</span>
            <select
              className="form-select"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </label>
        </div>
      )}

      {loading && (
        <div className="projects-grid">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {!loading && error && (
        <div className="page-error">
          <p className="page-error__text">{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={loadProjects}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="empty-state empty-state--page">
          <div className="empty-state__icon" aria-hidden="true" />
          <p className="empty-state__text">No projects yet.</p>
          <p className="empty-state__hint">
            Create your first project to get started.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setCreateOpen(true)}
          >
            Create Project
          </button>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        visibleProjects.length > 0 ? (
          <div className="projects-grid">
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={setEditProject}
                onDelete={setDeleteProjectTarget}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--page empty-state--filtered">
            <div className="empty-state__icon" aria-hidden="true" />
            <p className="empty-state__text">No projects match your search.</p>
            <p className="empty-state__hint">Try a different name or description.</p>
          </div>
        )
      )}

      <ProjectFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        title="Create Project"
        submitLabel="Create Project"
        submittingLabel="Creating..."
      />

      <ProjectFormModal
        isOpen={Boolean(editProject)}
        onClose={() => setEditProject(null)}
        onSubmit={handleEdit}
        initialValues={{
          name: editProject?.name || '',
          description: editProject?.description || '',
        }}
        title="Edit Project"
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteProjectTarget)}
        onClose={() => setDeleteProjectTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
