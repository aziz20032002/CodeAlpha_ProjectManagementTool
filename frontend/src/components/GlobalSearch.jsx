import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../services/projectService';
import { getProjectTasks } from '../services/taskService';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  async function loadSearchData(force = false) {
    if ((!force && loaded) || loading) return;
    setLoading(true);
    setError('');

    try {
      const projectData = await getProjects();
      const accessibleProjects = Array.isArray(projectData) ? projectData : [];
      setProjects(accessibleProjects);

      const taskResults = await Promise.allSettled(
        accessibleProjects.map((project) => getProjectTasks(project.id)),
      );
      const accessibleTasks = taskResults.flatMap((result, index) =>
        result.status === 'fulfilled' && Array.isArray(result.value)
          ? result.value.map((task) => ({
              ...task,
              projectName: accessibleProjects[index].name,
            }))
          : [],
      );
      setTasks(accessibleTasks);
      setLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load search data.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const projectResults = useMemo(
    () =>
      normalizedQuery
        ? projects
            .filter((project) => project.name?.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [],
    [normalizedQuery, projects],
  );
  const taskResults = useMemo(
    () =>
      normalizedQuery
        ? tasks
            .filter((task) => task.title?.toLowerCase().includes(normalizedQuery))
            .slice(0, 6)
        : [],
    [normalizedQuery, tasks],
  );
  const results = useMemo(
    () => [
      ...projectResults.map((project) => ({
        key: `project-${project.id}`,
        label: project.name,
        meta: 'Project',
        type: 'project',
        to: `/projects/${project.id}`,
      })),
      ...taskResults.map((task) => ({
        key: `task-${task.id}`,
        label: task.title,
        meta: task.projectName,
        type: 'task',
        to: `/tasks/${task.id}`,
      })),
    ],
    [projectResults, taskResults],
  );

  useEffect(() => setActiveIndex(-1), [query]);

  function openSearch() {
    setIsOpen(true);
    loadSearchData(true);
  }

  function selectResult(result) {
    setIsOpen(false);
    setQuery('');
    navigate(result.to);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  let resultIndex = -1;

  return (
    <div className="global-search" ref={rootRef}>
      <span className="global-search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="global-search__input"
        placeholder="Search"
        value={query}
        onFocus={openSearch}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-label="Search projects and tasks"
        aria-expanded={isOpen}
        aria-controls="global-search-results"
        aria-activedescendant={activeIndex >= 0 ? results[activeIndex]?.key : undefined}
        autoComplete="off"
      />

      {isOpen && (
        <div className="global-search__panel" id="global-search-results" role="listbox">
          {loading && <p className="global-search__state">Loading search data…</p>}
          {!loading && error && (
            <div className="global-search__state global-search__state--error">
              <p>{error}</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => loadSearchData(true)}>
                Try Again
              </button>
            </div>
          )}
          {!loading && !error && !normalizedQuery && (
            <p className="global-search__state">Search accessible projects and tasks.</p>
          )}
          {!loading && !error && normalizedQuery && results.length === 0 && (
            <p className="global-search__state">No results found.</p>
          )}

          {!loading && !error && projectResults.length > 0 && (
            <div className="global-search__group">
              <p className="global-search__group-title">Projects</p>
              {projectResults.map((project) => {
                resultIndex += 1;
                const index = resultIndex;
                const result = results[index];
                return (
                  <button
                    key={result.key}
                    id={result.key}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`global-search__result${activeIndex === index ? ' global-search__result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                  >
                    <span className="global-search__result-icon" data-type="project" aria-hidden="true" />
                    <span><strong>{result.label}</strong><small>{result.meta}</small></span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && taskResults.length > 0 && (
            <div className="global-search__group">
              <p className="global-search__group-title">Tasks</p>
              {taskResults.map((task) => {
                resultIndex += 1;
                const index = resultIndex;
                const result = results[index];
                return (
                  <button
                    key={result.key}
                    id={result.key}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`global-search__result${activeIndex === index ? ' global-search__result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                  >
                    <span className="global-search__result-icon" data-type="task" aria-hidden="true" />
                    <span><strong>{result.label}</strong><small>{result.meta}</small></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
