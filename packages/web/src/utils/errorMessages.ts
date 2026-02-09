/**
 * User-friendly, actionable error messages for Kubidu
 * Instead of generic "Failed to X" messages, provide helpful context and solutions
 */

interface ErrorContext {
  code?: string;
  status?: number;
  message?: string;
  field?: string;
}

interface UserFriendlyError {
  title: string;
  description: string;
  action?: string;
  actionUrl?: string;
}

const ERROR_MESSAGES: Record<string, UserFriendlyError> = {
  // Authentication errors
  'INVALID_CREDENTIALS': {
    title: 'Invalid email or password',
    description: 'Please check your credentials and try again.',
    action: 'Forgot your password?',
    actionUrl: '/forgot-password',
  },
  'EMAIL_NOT_VERIFIED': {
    title: 'Email not verified',
    description: 'Please verify your email address to continue.',
    action: 'Resend verification email',
  },
  'SESSION_EXPIRED': {
    title: 'Session expired',
    description: 'Your session has expired. Please log in again.',
    action: 'Log in',
    actionUrl: '/login',
  },
  'UNAUTHORIZED': {
    title: 'Access denied',
    description: 'You don\'t have permission to access this resource.',
  },
  
  // Project/Service errors
  'PROJECT_NOT_FOUND': {
    title: 'Project not found',
    description: 'This project may have been deleted or you don\'t have access.',
    action: 'Go to projects',
    actionUrl: '/projects',
  },
  'SERVICE_DEPLOY_FAILED': {
    title: 'Deployment failed',
    description: 'Your service couldn\'t be deployed. Check your configuration.',
    action: 'View deployment logs',
  },
  'INVALID_DOCKER_IMAGE': {
    title: 'Invalid Docker image',
    description: 'The Docker image could not be found. Make sure it exists and is publicly accessible.',
  },
  'PORT_CONFLICT': {
    title: 'Port conflict',
    description: 'This port is already in use by another service.',
  },
  'RESOURCE_LIMIT_EXCEEDED': {
    title: 'Resource limit exceeded',
    description: 'Your workspace has reached its resource limits.',
    action: 'Upgrade plan',
    actionUrl: '/billing',
  },
  
  // Domain errors
  'DOMAIN_ALREADY_EXISTS': {
    title: 'Domain already in use',
    description: 'This domain is already connected to another service.',
  },
  'DOMAIN_VERIFICATION_FAILED': {
    title: 'Domain verification failed',
    description: 'Please add the required DNS records and try again.',
    action: 'View DNS instructions',
  },
  'SSL_CERT_FAILED': {
    title: 'SSL certificate failed',
    description: 'Could not issue SSL certificate. Check your DNS settings.',
  },
  
  // Environment variable errors
  'ENV_VAR_NAME_INVALID': {
    title: 'Invalid variable name',
    description: 'Variable names must start with a letter and contain only letters, numbers, and underscores.',
  },
  'ENV_VAR_CIRCULAR_REF': {
    title: 'Circular reference detected',
    description: 'Environment variables cannot reference each other in a loop.',
  },
  
  // Network errors
  'NETWORK_ERROR': {
    title: 'Connection lost',
    description: 'Please check your internet connection and try again.',
  },
  'SERVER_ERROR': {
    title: 'Something went wrong',
    description: 'Our servers are having issues. Please try again in a moment.',
  },
  'RATE_LIMITED': {
    title: 'Too many requests',
    description: 'Please wait a moment before trying again.',
  },
  
  // Workspace/Team errors
  'WORKSPACE_LIMIT_REACHED': {
    title: 'Workspace limit reached',
    description: 'You\'ve reached the maximum number of workspaces for your plan.',
    action: 'Upgrade plan',
    actionUrl: '/billing',
  },
  'MEMBER_ALREADY_EXISTS': {
    title: 'Member already invited',
    description: 'This user is already a member of this workspace.',
  },
  'CANNOT_REMOVE_OWNER': {
    title: 'Cannot remove owner',
    description: 'You cannot remove the workspace owner. Transfer ownership first.',
  },
  
  // Template errors
  'TEMPLATE_NOT_FOUND': {
    title: 'Template not found',
    description: 'This template may have been removed or is temporarily unavailable.',
    action: 'Browse templates',
    actionUrl: '/templates',
  },
  'TEMPLATE_DEPLOY_FAILED': {
    title: 'Template deployment failed',
    description: 'Could not deploy this template. Please try again.',
  },
};

// HTTP status code fallbacks
const STATUS_FALLBACKS: Record<number, UserFriendlyError> = {
  400: {
    title: 'Invalid request',
    description: 'Please check your input and try again.',
  },
  401: {
    title: 'Authentication required',
    description: 'Please log in to continue.',
    action: 'Log in',
    actionUrl: '/login',
  },
  403: {
    title: 'Access denied',
    description: 'You don\'t have permission to perform this action.',
  },
  404: {
    title: 'Not found',
    description: 'The requested resource could not be found.',
  },
  409: {
    title: 'Conflict',
    description: 'This action conflicts with existing data.',
  },
  422: {
    title: 'Validation error',
    description: 'Please check your input and correct any errors.',
  },
  429: {
    title: 'Too many requests',
    description: 'You\'re doing that too fast. Please wait a moment.',
  },
  500: {
    title: 'Server error',
    description: 'Something went wrong on our end. Please try again.',
  },
  502: {
    title: 'Service unavailable',
    description: 'The service is temporarily unavailable. Please try again.',
  },
  503: {
    title: 'Service unavailable',
    description: 'We\'re doing some maintenance. Please try again shortly.',
  },
};

// Field-specific error messages
const FIELD_ERRORS: Record<string, string> = {
  'email': 'Please enter a valid email address',
  'password': 'Password must be at least 8 characters',
  'name': 'Name is required',
  'port': 'Port must be between 1 and 65535',
  'cpu': 'Invalid CPU value (e.g., 500m, 1000m)',
  'memory': 'Invalid memory value (e.g., 256Mi, 1Gi)',
  'replicas': 'Replicas must be between 1 and 10',
  'domain': 'Please enter a valid domain name',
};

/**
 * Convert an API error to a user-friendly message
 */
export function getErrorMessage(error: any, context?: string): UserFriendlyError {
  // Extract error details
  const errorData: ErrorContext = {
    code: error?.response?.data?.code || error?.code,
    status: error?.response?.status || error?.status,
    message: error?.response?.data?.message || error?.message,
    field: error?.response?.data?.field,
  };

  // 1. Check for specific error code
  if (errorData.code && ERROR_MESSAGES[errorData.code]) {
    return ERROR_MESSAGES[errorData.code];
  }

  // 2. Check for field-specific error
  if (errorData.field && FIELD_ERRORS[errorData.field]) {
    return {
      title: 'Validation error',
      description: FIELD_ERRORS[errorData.field],
    };
  }

  // 3. Check for HTTP status fallback
  if (errorData.status && STATUS_FALLBACKS[errorData.status]) {
    return STATUS_FALLBACKS[errorData.status];
  }

  // 4. Network error detection
  if (!navigator.onLine || error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') {
    return ERROR_MESSAGES['NETWORK_ERROR'];
  }

  // 5. Construct contextual fallback
  const actionWord = context || 'complete this action';
  return {
    title: `Couldn't ${actionWord}`,
    description: errorData.message || 'Something went wrong. Please try again.',
  };
}

/**
 * Get a short error message (for toasts)
 */
export function getShortErrorMessage(error: any, context?: string): string {
  const friendly = getErrorMessage(error, context);
  return friendly.description;
}

/**
 * Format validation errors from API (array of field errors)
 */
export function formatValidationErrors(errors: Array<{ field: string; message: string }>): string {
  return errors.map(e => `${e.field}: ${e.message}`).join('\n');
}

export default {
  getErrorMessage,
  getShortErrorMessage,
  formatValidationErrors,
  ERROR_MESSAGES,
};
