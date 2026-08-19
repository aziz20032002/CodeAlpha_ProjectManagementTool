import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import KanbanBoard from '../components/KanbanBoard';
import ProjectFormModal from '../components/ProjectFormModal';
import RoleBadge from '../components/RoleBadge';
import TaskFormModal from '../components/TaskFormModal';
import TeamMembers from '../components/TeamMembers';
import { useAuth } from '../context/AuthContext';
import {
  deleteProject,
  getProjectById,
  updateProject,
} from '../services/projectService';
import {
  createTask,
  deleteTask,
  getProjectTasks,
  updateTask,
} from '../services/taskService';
import socket from '../services/socket';
import { formatDate } from '../utils/formatDate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { enrichTask } from '../utils/taskUtils';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [members, setMembers] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');

  const [taskModal, setTaskModal] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [movingTaskIds, setMovingTaskIds] = useState(() => new Set());

  const isOwner = project?.role === 'owner';

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getProjectById(id);
      setProject(data);
    } catch (err) {
      setProject(null);
      setError(getApiErrorMessage(err, 'Unable to load project.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError('');

    try {
      const data = await getProjectTasks(id);
      setTasks(data);
    } catch (err) {
      setTasksError(getApiErrorMessage(err, 'Unable to load tasks.'));
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
    loadTasks();
  }, [loadProject, loadTasks]);

  useEffect(() => {
    const projectId = Number(id);
    if (!Number.isSafeInteger(projectId) || projectId <= 0) return undefined;

    const joinProject = () => socket.emit('join_project', { projectId });
    const handleTaskCreated = ({ task: incoming }) => {
      if (Number(incoming?.project_id) !== projectId) return;
      setTasks((prev) =>
        prev.some((task) => Number(task.id) === Number(incoming.id))
          ? prev
          : [enrichTask(incoming), ...prev],
      );
    };
    const handleTaskUpdated = ({ task: incoming }) => {
      if (Number(incoming?.project_id) !== projectId) return;
      setTasks((prev) =>
        prev.map((task) =>
          Number(task.id) === Number(incoming.id)
            ? enrichTask(incoming)
            : task,
        ),
      );
    };
    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) =>
        prev.filter((task) => Number(task.id) !== Number(taskId)),
      );
    };

    socket.on('connect', joinProject);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    if (socket.connected) joinProject();

    return () => {
      socket.emit('leave_project', { projectId });
      socket.off('connect', joinProject);
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
    };
  }, [id]);

  useEffect(() => {
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

  function canManageTask(task) {
    if (isOwner) return true;
    return Number(task.creator?.id) === Number(user?.id);
  }

  async function handleEdit({ name, description }) {
    const { project: updatedProject } = await updateProject(id, {
      name,
      description,
    });
    setProject((prev) => ({ ...prev, ...updatedProject }));
    setEditOpen(false);
    setSuccessMessage('Project updated successfully.');
  }

  async function handleDelete() {
    await deleteProject(id);
    navigate('/projects', {
      state: { successMessage: 'Project deleted successfully.' },
    });
  }

  async function handleCreateTask(payload) {
    if (!isOwner) return;

    const { task } = await createTask(id, payload);
    setTasks((prev) =>
      prev.some((item) => Number(item.id) === Number(task.id))
        ? prev
        : [enrichTask(task, members, user), ...prev],
    );
    setTaskModal(null);
    setSuccessMessage('Task created successfully.');
  }

  function handleOpenCreateTask(status) {
    if (!isOwner) return;
    setTaskModal({ mode: 'create', status });
  }

  async function handleUpdateTask(payload) {
    const taskId = taskModal?.task?.id;
    const { task } = await updateTask(taskId, payload);
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? enrichTask(task, members, user) : item)),
    );
    setTaskModal(null);
    setSuccessMessage('Task updated successfully.');
  }

  async function handleMoveTask(task, status) {
    if (!canManageTask(task) || task.status === status) return;

    const taskId = Number(task.id);
    if (movingTaskIds.has(taskId)) return;
    const previousStatus = task.status;
    setMovingTaskIds((current) => new Set(current).add(taskId));
    setTasks((current) =>
      current.map((item) =>
        Number(item.id) === taskId ? { ...item, status } : item,
      ),
    );

    try {
      const { task: updated } = await updateTask(task.id, { status });
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? enrichTask(updated, members, user) : item,
        ),
      );
    } catch (err) {
      setTasks((current) =>
        current.map((item) =>
          Number(item.id) === taskId ? { ...item, status: previousStatus } : item,
        ),
      );
      setTasksError(getApiErrorMessage(err, 'Unable to update task.'));
    } finally {
      setMovingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return;

    await deleteTask(taskToDelete.id);
    setTasks((prev) => prev.filter((item) => item.id !== taskToDelete.id));
    setTaskToDelete(null);
    setSuccessMessage('Task deleted successfully.');
  }

  if (loading) {
    return (
      <div className="page page--fade-in">
        <div className="page-header">
          <div className="skeleton skeleton--heading" />
          <div className="skeleton skeleton--text skeleton--short" />
        </div>
        <KanbanBoard
          tasks={[]}
          loading
          error=""
          onRetry={() => {}}
          canManageTask={() => false}
          canCreateTask={false}
          onAddTask={() => {}}
          onMove={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page--fade-in">
        <div className="page-error">
          <p className="page-error__text">{error}</p>
          <div className="page-error__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={loadProject}>
              Try again
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => navigate('/projects')}
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEditingTask = taskModal?.mode === 'edit';

  return (
    <div className="page page--fade-in">
      {successMessage && (
        <div className="page-banner page-banner--success" role="status">
          {successMessage}
        </div>
      )}

      <div className="page-header page-header--row">
        <div>
          <div className="page-header__title-row">
            <h2 className="page-header__title">{project.name}</h2>
            <RoleBadge role={project.role} />
          </div>
          <p className="page-header__subtitle">
            {project.description || 'No description provided.'}
          </p>
          <div className="project-details-meta">
            <span>Created {formatDate(project.created_at)}</span>
            {isOwner && <span className="project-details-meta__owner">You are the owner</span>}
          </div>
        </div>

        {isOwner && (
          <div className="page-header__actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setEditOpen(true)}
            >
              Edit Project
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--danger-text"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Project
            </button>
          </div>
        )}
      </div>

      <TeamMembers
        projectId={id}
        isOwner={isOwner}
        onSuccess={setSuccessMessage}
        onMembersChange={setMembers}
      />

      <KanbanBoard
        tasks={tasks}
        loading={tasksLoading}
        error={tasksError}
        onRetry={loadTasks}
        canManageTask={canManageTask}
        canCreateTask={isOwner}
        onAddTask={handleOpenCreateTask}
        onMove={handleMoveTask}
        onEdit={(task) => setTaskModal({ mode: 'edit', task })}
        onDelete={setTaskToDelete}
        members={members}
        movingTaskIds={movingTaskIds}
      />

      <ProjectFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initialValues={{
          name: project.name,
          description: project.description || '',
        }}
        title="Edit Project"
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />

      <TaskFormModal
        isOpen={Boolean(taskModal) && (isEditingTask || isOwner)}
        onClose={() => setTaskModal(null)}
        onSubmit={isEditingTask ? handleUpdateTask : handleCreateTask}
        members={members}
        task={isEditingTask ? taskModal.task : null}
        defaultStatus={taskModal?.status || 'todo'}
        title={isEditingTask ? 'Edit Task' : 'Create Task'}
        submitLabel={isEditingTask ? 'Save Changes' : 'Create Task'}
        submittingLabel={isEditingTask ? 'Saving...' : 'Creating...'}
      />

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <DeleteConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Delete this task?"
        description="This action cannot be undone."
        confirmLabel="Delete Task"
        submittingLabel="Deleting..."
        fallbackError="Unable to delete task."
      />
    </div>
  );
}
