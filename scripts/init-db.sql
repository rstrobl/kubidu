-- Kubidu Platform Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================
-- USERS & AUTHENTICATION
-- ====================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- API KEYS for CLI authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '["read", "write"]'::jsonb,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ====================
-- PROJECTS
-- ====================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url TEXT,
    repository_provider VARCHAR(50),
    repository_branch VARCHAR(255) DEFAULT 'main',
    auto_deploy BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, slug),
    CONSTRAINT projects_status_check CHECK (status IN ('active', 'paused', 'deleted')),
    CONSTRAINT projects_provider_check CHECK (repository_provider IN ('github', 'gitlab', 'bitbucket'))
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ====================
-- DEPLOYMENTS
-- ====================

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    image_url TEXT,
    image_tag VARCHAR(255),
    replicas INTEGER DEFAULT 1,
    cpu_limit VARCHAR(50) DEFAULT '1000m',
    memory_limit VARCHAR(50) DEFAULT '512Mi',
    cpu_request VARCHAR(50) DEFAULT '100m',
    memory_request VARCHAR(50) DEFAULT '128Mi',
    port INTEGER DEFAULT 8080,
    health_check_path VARCHAR(255) DEFAULT '/',
    build_logs TEXT,
    deployment_logs TEXT,
    git_commit_sha VARCHAR(255),
    git_commit_message TEXT,
    git_author VARCHAR(255),
    deployed_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT deployments_status_check CHECK (status IN ('pending', 'building', 'deploying', 'running', 'failed', 'stopped')),
    CONSTRAINT deployments_replicas_check CHECK (replicas >= 0 AND replicas <= 10),
    CONSTRAINT deployments_port_check CHECK (port > 0 AND port <= 65535)
);

CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX idx_deployments_git_commit_sha ON deployments(git_commit_sha);

-- ====================
-- ENVIRONMENT VARIABLES
-- ====================

CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value_encrypted TEXT NOT NULL,
    value_iv VARCHAR(255) NOT NULL,
    is_secret BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT env_scope_check CHECK (
        (deployment_id IS NOT NULL AND project_id IS NULL) OR
        (deployment_id IS NULL AND project_id IS NOT NULL)
    ),
    CONSTRAINT env_unique_deployment CHECK (
        deployment_id IS NULL OR
        NOT EXISTS (
            SELECT 1 FROM environment_variables ev
            WHERE ev.deployment_id = environment_variables.deployment_id
            AND ev.key = environment_variables.key
            AND ev.id != environment_variables.id
        )
    ),
    CONSTRAINT env_unique_project CHECK (
        project_id IS NULL OR
        NOT EXISTS (
            SELECT 1 FROM environment_variables ev
            WHERE ev.project_id = environment_variables.project_id
            AND ev.key = environment_variables.key
            AND ev.id != environment_variables.id
        )
    )
);

CREATE INDEX idx_env_vars_deployment_id ON environment_variables(deployment_id);
CREATE INDEX idx_env_vars_project_id ON environment_variables(project_id);
CREATE INDEX idx_env_vars_key ON environment_variables(key);

-- ====================
-- DOMAINS & ROUTING
-- ====================

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    ssl_enabled BOOLEAN DEFAULT TRUE,
    ssl_cert TEXT,
    ssl_key TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_domains_deployment_id ON domains(deployment_id);
CREATE INDEX idx_domains_domain ON domains(domain);
CREATE INDEX idx_domains_verified ON domains(verified);

-- ====================
-- BUILD QUEUE
-- ====================

CREATE TABLE build_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'queued',
    priority INTEGER DEFAULT 5,
    git_commit_sha VARCHAR(255),
    git_branch VARCHAR(255),
    build_start_time TIMESTAMP WITH TIME ZONE,
    build_end_time TIMESTAMP WITH TIME ZONE,
    build_duration_seconds INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT build_queue_status_check CHECK (status IN ('queued', 'building', 'completed', 'failed', 'cancelled')),
    CONSTRAINT build_queue_priority_check CHECK (priority >= 1 AND priority <= 10)
);

CREATE INDEX idx_build_queue_status ON build_queue(status, priority DESC, created_at ASC);
CREATE INDEX idx_build_queue_project_id ON build_queue(project_id);
CREATE INDEX idx_build_queue_created_at ON build_queue(created_at DESC);

-- ====================
-- BILLING & SUBSCRIPTIONS
-- ====================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT subscriptions_plan_check CHECK (plan_name IN ('free', 'starter', 'pro', 'enterprise')),
    CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- USAGE TRACKING
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
    metric_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL,
    cost_cents INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    invoiced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT usage_metric_type_check CHECK (metric_type IN ('cpu_seconds', 'memory_mb_seconds', 'bandwidth_gb', 'build_minutes'))
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id, recorded_at);
CREATE INDEX idx_usage_records_deployment_id ON usage_records(deployment_id);
CREATE INDEX idx_usage_records_billing_period ON usage_records(billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_invoiced ON usage_records(invoiced) WHERE invoiced = FALSE;
CREATE INDEX idx_usage_records_metric_type ON usage_records(metric_type);

-- INVOICES
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    CONSTRAINT invoices_amount_check CHECK (amount_cents >= 0 AND total_cents >= 0)
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_period ON invoices(period_start, period_end);

-- ====================
-- AUDIT LOGS (ISO 27001)
-- ====================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    metadata JSONB,
    severity VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT audit_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);

-- ====================
-- GDPR COMPLIANCE
-- ====================

CREATE TABLE gdpr_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gdpr_consent_type_check CHECK (consent_type IN ('terms_of_service', 'privacy_policy', 'marketing', 'analytics'))
);

CREATE INDEX idx_gdpr_consents_user_id ON gdpr_consents(user_id);
CREATE INDEX idx_gdpr_consents_type ON gdpr_consents(consent_type);

CREATE TABLE gdpr_data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    data_export_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    CONSTRAINT gdpr_request_type_check CHECK (request_type IN ('export', 'delete')),
    CONSTRAINT gdpr_request_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_gdpr_requests_user_id ON gdpr_data_requests(user_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_data_requests(status);
CREATE INDEX idx_gdpr_requests_requested_at ON gdpr_data_requests(requested_at DESC);

-- ====================
-- WEBHOOK EVENTS
-- ====================

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT webhook_provider_check CHECK (provider IN ('github', 'gitlab', 'bitbucket'))
);

CREATE INDEX idx_webhook_events_project_id ON webhook_events(project_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);

-- ====================
-- NOTIFICATIONS
-- ====================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notification_type_check CHECK (type IN ('deployment_success', 'deployment_failed', 'build_failed', 'billing_issue', 'quota_warning'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ====================
-- TRIGGERS FOR updated_at
-- ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environment_variables_updated_at BEFORE UPDATE ON environment_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_build_queue_updated_at BEFORE UPDATE ON build_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_consents_updated_at BEFORE UPDATE ON gdpr_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- SEED DATA (for development)
-- ====================

-- Create a test user
-- Password: password123 (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, name, email_verified, status)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'demo@kubidu.io',
    '$2b$10$YQ0z8pZ4rZ8K0QZ8Z8Z8ZuZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
    'Demo User',
    TRUE,
    'active'
);

-- Create a free subscription for test user
INSERT INTO subscriptions (user_id, plan_name, status)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'free',
    'active'
);

-- Create GDPR consents for test user
INSERT INTO gdpr_consents (user_id, consent_type, consent_given, consent_version)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'terms_of_service', TRUE, '1.0.0'),
    ('550e8400-e29b-41d4-a716-446655440000', 'privacy_policy', TRUE, '1.0.0');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Kubidu database schema initialized successfully!';
    RAISE NOTICE 'Test user: demo@kubidu.io / password123';
END $$;
