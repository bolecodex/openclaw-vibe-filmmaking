-- Batch jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_folder TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  meta TEXT
);

-- Batch tasks (one per novel/project)
CREATE TABLE IF NOT EXISTS batch_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  novel_file TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step_id TEXT,
  error_message TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_batch_tasks_job_id ON batch_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status);

-- Task executions (history per step)
CREATE TABLE IF NOT EXISTS task_executions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES batch_tasks(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT,
  token_usage TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);

-- Task queue (pending work items)
CREATE TABLE IF NOT EXISTS task_queue (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES batch_tasks(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  worker_id TEXT,
  scheduled_at INTEGER NOT NULL,
  started_at INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_queue_status_scheduled ON task_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_task_queue_task_id ON task_queue(task_id);
