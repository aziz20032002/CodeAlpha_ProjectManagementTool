CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(30) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_by INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done')),
    CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id)
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_project FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_task FOREIGN KEY (task_id)
        REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER,
    task_id INTEGER,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_project FOREIGN KEY (project_id)
        REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_activities_task FOREIGN KEY (task_id)
        REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_project_id
ON activities(project_id);

CREATE INDEX IF NOT EXISTS idx_activities_created_at
ON activities(created_at DESC);
