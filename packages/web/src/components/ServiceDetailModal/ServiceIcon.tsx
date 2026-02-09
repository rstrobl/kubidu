import { Service } from './types';

interface ServiceIconProps {
  service: Service;
}

export function ServiceIcon({ service }: ServiceIconProps) {
  const imageOrName = (service.dockerImage || service.name || '').toLowerCase();

  if (imageOrName.includes('postgres') || imageOrName.includes('postgresql')) {
    return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" className="w-5 h-5" />;
  }
  if (imageOrName.includes('mysql') || imageOrName.includes('mariadb')) {
    return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" alt="MySQL" className="w-5 h-5" />;
  }
  if (imageOrName.includes('redis')) {
    return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" alt="Redis" className="w-5 h-5" />;
  }
  if (imageOrName.includes('mongo')) {
    return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" alt="MongoDB" className="w-5 h-5" />;
  }
  if (imageOrName.includes('wordpress') || imageOrName.includes('wp-')) {
    return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg" alt="WordPress" className="w-5 h-5" />;
  }
  if (imageOrName.includes('n8n')) {
    return <img src="https://n8n.io/favicon.ico" alt="n8n" className="w-5 h-5" />;
  }
  if (imageOrName.includes('ghost')) {
    return <img src="https://ghost.org/favicon.ico" alt="Ghost" className="w-5 h-5" />;
  }
  if (imageOrName.includes('prefect')) {
    return <img src="https://api.iconify.design/simple-icons/prefect.svg" alt="Prefect" className="w-5 h-5" />;
  }
  if (imageOrName.includes('directus')) {
    return <img src="https://raw.githubusercontent.com/directus/directus/main/app/public/favicon.ico" alt="Directus" className="w-5 h-5" />;
  }
  if (imageOrName.includes('openclaw')) {
    return <img src="https://openclaw.ai/favicon.ico" alt="OpenClaw" className="w-5 h-5" />;
  }
  if (imageOrName.includes('uptime-kuma') || imageOrName.includes('uptime_kuma')) {
    return <img src="https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon.svg" alt="Uptime Kuma" className="w-5 h-5" />;
  }
  if (imageOrName.includes('minio')) {
    return <img src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/minio.svg" alt="MinIO" className="w-5 h-5" />;
  }
  if (service.templateDeploymentId) {
    return (
      <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (service.serviceType === 'GITHUB') {
    return (
      <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    );
  }
  // Docker image fallback
  return (
    <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
    </svg>
  );
}
