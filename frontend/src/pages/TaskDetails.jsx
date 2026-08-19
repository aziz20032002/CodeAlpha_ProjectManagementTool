import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import CommentForm from '../components/CommentForm';
import CommentList from '../components/CommentList';
import PriorityBadge from '../components/PriorityBadge';
import TaskFormModal from '../components/TaskFormModal';
import { useAuth } from '../context/AuthContext';
import {
  addComment,
  deleteComment,
  getTaskComments,
  updateComment,
} from '../services/commentService';
import { getProjectMembers } from '../services/memberService';
import { getProjectById } from '../services/projectService';
import { deleteTask, getTaskById, updateTask } from '../services/taskService';
import socket from '../services/socket';
import { formatDate, formatDueDate } from '../utils/formatDate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getStatusLabel, isOverdue } from '../utils/taskUtils';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getTaskById(id);
      setTask(data);

      try {
        const [project, projectMembers] = await Promise.all([
          getProjectById(data.project_id),
          getProjectMembers(data.project_id),
        ]);
        setIsOwner(project.role === 'owner');
        setMembers(projectMembers);
      } catch {
        setIsOwner(false);
        setMembers([]);
      }
    } catch (err) {
      setTask(null);
      setError(getApiErrorMessage(err, 'Unable to load task.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentsError('');

    try {
      const data = await getTaskComments(id);
      setComments(data);
    } catch (err) {
      setCommentsError(getApiErrorMessage(err, 'Unable to load comments.'));
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    const projectId = Number(task?.project_id);
    const taskId = Number(id);
    if (!Number.isSafeInteger(projectId) || projectId <= 0) return undefined;

    const joinProject = () => socket.emit('join_project', { projectId });
    const handleTaskUpdated = ({ task: incoming }) => {
      if (Number(incoming?.id) === taskId) {
        setTask(incoming);
      }
    };
    const handleTaskDeleted = ({ taskId: deletedTaskId }) => {
      if (Number(deletedTaskId) === taskId) {
        setTask(null);
        setError('This task has been deleted.');
      }
    };
    const handleCommentCreated = ({ taskId: eventTaskId, comment }) => {
      if (Number(eventTaskId) !== taskId || !comment) return;
      setComments((prev) =>
        prev.some((item) => Number(item.id) === Number(comment.id))
          ? prev
          : [...prev, comment],
      );
    };
    const handleCommentUpdated = ({ taskId: eventTaskId, comment }) => {
      if (Number(eventTaskId) !== taskId || !comment) return;
      setComments((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(comment.id) ? comment : item,
        ),
      );
    };
    const handleCommentDeleted = ({ taskId: eventTaskId, commentId }) => {
      if (Number(eventTaskId) !== taskId) return;
      setComments((prev) =>
        prev.filter((comment) => Number(comment.id) !== Number(commentId)),
      );
    };

    socket.on('connect', joinProject);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('comment_created', handleCommentCreated);
    socket.on('comment_updated', handleCommentUpdated);
    socket.on('comment_deleted', handleCommentDeleted);
    if (socket.connected) joinProject();

    return () => {
      socket.emit('leave_project', { projectId });
      socket.off('connect', joinProject);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('comment_created', handleCommentCreated);
      socket.off('comment_updated', handleCommentUpdated);
      socket.off('comment_deleted', handleCommentDeleted);
    };
  }, [id, task?.project_id]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const canManage =
    isOwner || Number(task?.created_by) === Number(user?.id);

  async function handleUpdate(payload) {
    const { task: updated } = await updateTask(id, payload);
    setTask(updated);
    setEditOpen(false);
    setSuccessMessage('Task updated successfully.');
  }

  async function handleDelete() {
    await deleteTask(id);
    navigate(`/projects/${task.project_id}`, {
      state: { successMessage: 'Task deleted successfully.' },
    });
  }

  async function handleAddComment(content) {
    const { comment } = await addComment(id, content);
    if (comment?.author) {
      setComments((prev) =>
        prev.some((item) => Number(item.id) === Number(comment.id))
          ? prev
          : [...prev, comment],
      );
    } else {
      await loadComments();
    }
    setSuccessMessage('Comment added successfully.');
  }

  async function handleUpdateComment(commentId, content) {
    const { comment: updated } = await updateComment(commentId, content);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, ...updated, author: comment.author }
          : comment,
      ),
    );
    setSuccessMessage('Comment updated successfully.');
  }

  async function handleDeleteComment() {
    if (!commentToDelete) return;
    await deleteComment(commentToDelete.id);
    setComments((prev) =>
      prev.filter((comment) => comment.id !== commentToDelete.id),
    );
    setCommentToDelete(null);
    setSuccessMessage('Comment deleted successfully.');
  }

  if (loading) {
    return (
      <div className="page page--fade-in">
        <div className="task-details">
          <div className="card">
            <div className="card__body">
              <div className="skeleton skeleton--heading" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text skeleton--short" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page--fade-in">
        <div className="page-error">
          <p className="page-error__text">{error}</p>
          <div className="page-error__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={loadTask}>
              Try again
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => navigate(-1)}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div className="page page--fade-in">
      {successMessage && (
        <div className="page-banner page-banner--success" role="status">
          {successMessage}
        </div>
      )}

      <div className="task-details">
        <div className="task-details__layout">
          <div className="task-details__content">
            <div className="card task-details__primary-card">
            <div className="card__header">
              <div>
                <Link to={`/projects/${task.project_id}`} className="task-details__breadcrumb">
                  Back to Project Board
                </Link>
                <h2 className="card__title">{task.title}</h2>
                <p className="task-details__id">Task #{task.id}</p>
              </div>
            </div>

            <div className="card__body">
              <section className="task-section">
                <h3 className="task-section__label">Description</h3>
                <p
                  className={`task-section__text${
                    task.description ? '' : ' task-section__text--placeholder'
                  }`}
                >
                  {task.description || 'No description provided.'}
                </p>
              </section>
            </div>
            </div>

            <div className="card task-details__comments-card">
              <div className="card__header">
                <div>
                  <div className="comments-heading">
                    <h3 className="card__title">Comments</h3>
                    {!commentsLoading && !commentsError && (
                      <span className="comments-heading__count">{comments.length}</span>
                    )}
                  </div>
                  <p className="card__subtitle">Collaborate with your project team.</p>
                </div>
              </div>
              <div className="card__body comments-section">
                <CommentForm onSubmit={handleAddComment} />
                <CommentList
                  comments={comments}
                  loading={commentsLoading}
                  error={commentsError}
                  onRetry={loadComments}
                  currentUserId={user?.id}
                  isProjectOwner={isOwner}
                  onUpdate={handleUpdateComment}
                  onDelete={setCommentToDelete}
                />
              </div>
            </div>
          </div>

          <aside className="task-details__sidebar" aria-label="Task details and actions">
            <div className="card task-details__meta-card">
              <div className="card__header">
                <h3 className="card__title">Task details</h3>
              </div>
              <div className="card__body">
                <div className="task-meta-grid">
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Status</span>
                    <span className={`badge badge--status badge--status-${task.status}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Priority</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Due Date</span>
                    <span className={`task-meta-item__value${overdue ? ' task-card__due--overdue' : ''}`}>
                      {task.due_date
                        ? overdue
                          ? `Overdue · ${formatDueDate(task.due_date)}`
                          : formatDueDate(task.due_date)
                        : '—'}
                    </span>
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Assigned Member</span>
                    <span className="task-meta-item__value">{task.assigned_user?.name || 'Unassigned'}</span>
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Created By</span>
                    <span className="task-meta-item__value">{task.creator?.name || '—'}</span>
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Created</span>
                    <span className="task-meta-item__value">{formatDate(task.created_at)}</span>
                  </div>
                  <div className="task-meta-item">
                    <span className="task-meta-item__label">Updated</span>
                    <span className="task-meta-item__value">{formatDate(task.updated_at)}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="task-details__actions">
                    <button type="button" className="btn btn--secondary btn--full" onClick={() => setEditOpen(true)}>
                      Edit Task
                    </button>
                    <button type="button" className="btn btn--ghost btn--full btn--danger-text" onClick={() => setDeleteOpen(true)}>
                      Delete Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <TaskFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        members={members}
        task={task}
        title="Edit Task"
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this task?"
        description="This action cannot be undone."
        confirmLabel="Delete Task"
        submittingLabel="Deleting..."
        fallbackError="Unable to delete task."
      />

      <DeleteConfirmModal
        isOpen={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete this comment?"
        description="This action cannot be undone."
        confirmLabel="Delete Comment"
        submittingLabel="Deleting..."
        fallbackError="Unable to delete comment."
      />
    </div>
  );
}
