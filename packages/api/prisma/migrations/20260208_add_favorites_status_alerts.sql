-- Migration: Add favorites, status page, and resource alerts tables
-- Run this manually or as part of your deployment process

-- Favorite projects
CREATE TABLE IF NOT EXISTS favorite_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_projects_user ON favorite_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_projects_project ON favorite_projects(project_id);

-- Status page incidents
CREATE TYPE incident_status AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');
CREATE TYPE incident_severity AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

CREATE TABLE IF NOT EXISTS status_page_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status incident_status DEFAULT 'INVESTIGATING',
  severity incident_severity DEFAULT 'MINOR',
  affected_service_ids TEXT[],
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_incidents_project ON status_page_incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_status_incidents_status ON status_page_incidents(status);
CREATE INDEX IF NOT EXISTS idx_status_incidents_created ON status_page_incidents(created_at);

-- Status page updates (incident timeline)
CREATE TABLE IF NOT EXISTS status_page_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES status_page_incidents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status incident_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_updates_incident ON status_page_updates(incident_id);

-- Status page subscribers
CREATE TABLE IF NOT EXISTS status_page_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  confirmed BOOLEAN DEFAULT FALSE,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_status_subscribers_project ON status_page_subscribers(project_id);
CREATE INDEX IF NOT EXISTS idx_status_subscribers_token ON status_page_subscribers(token);

-- Alert types and statuses
CREATE TYPE alert_type AS ENUM ('CPU_HIGH', 'MEMORY_HIGH', 'DISK_HIGH', 'SERVICE_DOWN', 'BUILD_FAILED');
CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- Resource alerts
CREATE TABLE IF NOT EXISTS resource_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  service_id UUID,
  type alert_type NOT NULL,
  status alert_status DEFAULT 'ACTIVE',
  threshold FLOAT NOT NULL,
  current_value FLOAT NOT NULL,
  message TEXT NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_alerts_project ON resource_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_alerts_service ON resource_alerts(service_id);
CREATE INDEX IF NOT EXISTS idx_resource_alerts_status ON resource_alerts(status);
CREATE INDEX IF NOT EXISTS idx_resource_alerts_created ON resource_alerts(created_at);

-- Alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type alert_type NOT NULL,
  threshold FLOAT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_webhook BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, type)
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_project ON alert_rules(project_id);
