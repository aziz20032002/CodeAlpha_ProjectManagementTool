import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RoleBadge from '../components/RoleBadge';
import { getProjects } from '../services/projectService';
import { getProjectTasks } from '../services/taskService';
import { getProjectMembers } from '../services/memberService';
import { getActivities } from '../services/activityService';
import socket from '../services/socket';
import { formatDate } from '../utils/formatDate';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

function StatSkeleton() {
  return (
    <div className="stat-card stat-card--skeleton">
      <div className="skeleton skeleton--icon" />
      <div className="skeleton skeleton--value" />
    </div>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    tasks: null,
    members: null,
    completedTasks: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const data = await getProjects();
        const accessibleProjects = Array.isArray(data) ? data : [];

        if (!isMounted) return;
        setProjects(accessibleProjects);

        if (accessibleProjects.length === 0) {
          setDashboardStats({ tasks: 0, members: 0, completedTasks: 0 });
          return;
        }

        const [taskResults, memberResults] = await Promise.all([
          Promise.allSettled(
            accessibleProjects.map((project) => getProjectTasks(project.id)),
          ),
          Promise.allSettled(
            accessibleProjects.map((project) => getProjectMembers(project.id)),
          ),
        ]);

        if (!isMounted) return;

        const taskRequestsSucceeded = taskResults.every(
          (result) => result.status === 'fulfilled' && Array.isArray(result.value),
        );
        const memberRequestsSucceeded = memberResults.every(
          (result) => result.status === 'fulfilled' && Array.isArray(result.value),
        );

        const allTasks = taskRequestsSucceeded
          ? taskResults.flatMap((result) => result.value)
          : null;
        const uniqueMemberIds = memberRequestsSucceeded
          ? new Set(
              memberResults.flatMap((result) =>
                result.value.map((member) => String(member.id)),
              ),
            )
          : null;

        setDashboardStats({
          tasks: allTasks?.length ?? null,
          members: uniqueMemberIds?.size ?? null,
          completedTasks:
            allTasks?.filter((task) => task.status === 'done').length ?? null,
        });
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, 'Unable to load projects.'));
          setDashboardStats({
            tasks: null,
            members: null,
            completedTasks: null,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadActivities() {
      setActivitiesLoading(true);
      setActivitiesError('');

      try {
        const data = await getActivities();
        if (isMounted) {
          const fetchedActivities = Array.isArray(data) ? data : [];
          setActivities((current) => {
            const merged = [...fetchedActivities];
            current.forEach((activity) => {
              if (!merged.some((item) => Number(item.id) === Number(activity.id))) {
                merged.push(activity);
              }
            });
            return merged
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 6);
          });
        }
      } catch (err) {
        if (isMounted) {
          setActivitiesError(
            getApiErrorMessage(err, 'Unable to load recent activity.'),
          );
        }
      } finally {
        if (isMounted) setActivitiesLoading(false);
      }
    }

    loadActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (projects.length === 0) return undefined;

    const accessibleProjectIds = new Set(projects.map((project) => Number(project.id)));
    projects.forEach((project) => {
      socket.emit('join_project', { projectId: project.id });
    });

    const handleActivityCreated = ({ activity } = {}) => {
      if (!activity || !accessibleProjectIds.has(Number(activity.project_id))) return;

      setActivities((current) => {
        if (current.some((item) => Number(item.id) === Number(activity.id))) {
          return current;
        }
        return [activity, ...current].slice(0, 6);
      });
    };

    socket.on('activity_created', handleActivityCreated);
    return () => {
      socket.off('activity_created', handleActivityCreated);
      projects.forEach((project) => {
        socket.emit('leave_project', { projectId: project.id });
      });
    };
  }, [projects]);

  const recentProjects = projects.slice(0, 4);

  const stats = [
    {
      label: 'Projects',
      description: 'Total projects',
      value: error ? '--' : String(projects.length),
      icon: 'folder',
    },
    {
      label: 'Tasks',
      description: 'Total tasks across all projects',
      value: dashboardStats.tasks ?? '--',
      icon: 'check',
    },
    {
      label: 'Team Members',
      description: 'Across all projects',
      value: dashboardStats.members ?? '--',
      icon: 'users',
    },
    {
      label: 'Completed Tasks',
      description: 'Tasks completed',
      value: dashboardStats.completedTasks ?? '--',
      icon: 'done',
    },
  ];

  return (
    <div className="page page--fade-in">
      <div className="page-header">
        <h2 className="page-header__title">Project Dashboard</h2>
        <p className="page-header__subtitle">
          Manage your projects, tasks, and team collaboration.
        </p>
      </div>

      <div className="stats-grid">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-card__icon" data-icon={stat.icon} aria-hidden="true" />
              <div className="stat-card__content">
                <span className="stat-card__value">{stat.value}</span>
                <span className="stat-card__label">{stat.label}</span>
                <span className="stat-card__description">{stat.description}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card__header dashboard-section-header">
            <h3 className="card__title dashboard-section-title dashboard-section-title--projects">
              Recent Projects
            </h3>
            <Link className="dashboard-section-link" to="/projects">
              View all
            </Link>
          </div>
          <div className="card__body">
            {loading && (
              <div className="recent-projects-list">
                <div className="skeleton skeleton--text" />
                <div className="skeleton skeleton--text" />
                <div className="skeleton skeleton--text skeleton--short" />
              </div>
            )}

            {!loading && error && (
              <p className="card__error">{error}</p>
            )}

            {!loading && !error && recentProjects.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden="true" />
                <p className="empty-state__text">No projects yet</p>
                <p className="empty-state__hint">
                  Your recently updated projects will appear here.
                </p>
              </div>
            )}

            {!loading && !error && recentProjects.length > 0 && (
              <div className="recent-projects-list">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="recent-project-item"
                  >
                    <div className="recent-project-item__content">
                      <div className="recent-project-item__header">
                        <span className="recent-project-item__name">{project.name}</span>
                        <RoleBadge role={project.role} />
                      </div>
                      <p className="recent-project-item__description">
                        {project.description || 'No description provided.'}
                      </p>
                      <span className="recent-project-item__date">
                        Created {formatDate(project.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header dashboard-section-header">
            <h3 className="card__title dashboard-section-title dashboard-section-title--activity">
              Recent Activity
            </h3>
          </div>
          <div className="card__body">
            {activitiesLoading && (
              <div className="activity-list" aria-label="Loading recent activity">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="activity-item activity-item--skeleton">
                    <div className="skeleton skeleton--icon" />
                    <div className="activity-item__content">
                      <div className="skeleton skeleton--text" />
                      <div className="skeleton skeleton--text skeleton--short" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!activitiesLoading && activitiesError && (
              <p className="card__error">{activitiesError}</p>
            )}

            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <div className="empty-state empty-state--activity">
                <div className="empty-state__icon" aria-hidden="true" />
                <p className="empty-state__text">No recent activity</p>
                <p className="empty-state__hint">
                  Project activity will appear here when it becomes available.
                </p>
              </div>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <div className="activity-list">
                {activities.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <span
                      className="activity-item__icon"
                      data-type={activity.type}
                      aria-hidden="true"
                    />
                    <div className="activity-item__content">
                      <p className="activity-item__message">{activity.message}</p>
                      <div className="activity-item__meta">
                        {activity.project_name && (
                          <span title={activity.project_name}>
                            {activity.project_name}
                          </span>
                        )}
                        <time dateTime={activity.created_at}>
                          {formatRelativeTime(activity.created_at)}
                        </time>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
