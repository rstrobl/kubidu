import { useState, useEffect } from 'react';
import { Template } from '@kubidu/shared';
import { apiService } from '../services/api.service';
import { TemplateDeployModal } from './TemplateDeployModal';

interface QuickDeploySectionProps {
  projectId: string;
  onSuccess: () => void;
  variant?: 'full' | 'compact';
}

// Featured templates to show first (by slug)
const FEATURED_SLUGS = ['postgresql', 'n8n', 'ghost', 'minio', 'wordpress', 'directus'];

export function QuickDeploySection({ projectId, onSuccess, variant = 'full' }: QuickDeploySectionProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await apiService.getTemplates();
      // Sort: featured first, then by category
      const sorted = [...data].sort((a, b) => {
        const aFeatured = FEATURED_SLUGS.indexOf(a.slug);
        const bFeatured = FEATURED_SLUGS.indexOf(b.slug);
        
        if (aFeatured >= 0 && bFeatured >= 0) return aFeatured - bFeatured;
        if (aFeatured >= 0) return -1;
        if (bFeatured >= 0) return 1;
        
        return a.name.localeCompare(b.name);
      });
      setTemplates(sorted);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateIcon = (template: Template) => {
    const icon = template.icon;
    if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
      return <img src={icon} alt={template.name} className="w-8 h-8" />;
    }
    if (icon) {
      return <span className="text-2xl">{icon}</span>;
    }
    const defaultIcons: Record<string, string> = {
      database: '🗄️',
      cms: '📝',
      cache: '⚡',
      messaging: '📨',
      monitoring: '📊',
      automation: '🔄',
      storage: '💾',
    };
    return <span className="text-2xl">{defaultIcons[template.category || ''] || '📦'}</span>;
  };

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      database: 'bg-blue-100 text-blue-700',
      cms: 'bg-purple-100 text-purple-700',
      cache: 'bg-yellow-100 text-yellow-700',
      automation: 'bg-green-100 text-green-700',
      storage: 'bg-orange-100 text-orange-700',
      monitoring: 'bg-pink-100 text-pink-700',
    };
    return colors[category || ''] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) return null;

  const displayTemplates = showAll ? templates : templates.slice(0, 6);

  if (variant === 'compact') {
    // Compact horizontal bar for when project has services
    return (
      <>
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Quick Deploy:</span>
              {templates.slice(0, 5).map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors whitespace-nowrap"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    {renderTemplateIcon(template)}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{template.name}</span>
                </button>
              ))}
              {templates.length > 5 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                >
                  +{templates.length - 5} more
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedTemplate && (
          <TemplateDeployModal
            projectId={projectId}
            template={selectedTemplate}
            isOpen={true}
            onClose={() => setSelectedTemplate(null)}
            onSuccess={() => {
              setSelectedTemplate(null);
              onSuccess();
            }}
          />
        )}
      </>
    );
  }

  // Full variant - for empty state
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Deploy
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Deploy pre-configured services with one click
            </p>
          </div>
          {templates.length > 6 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all ({templates.length})
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className="group flex items-start gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-primary-200 hover:shadow-md transition-all text-left"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-gray-50 group-hover:bg-primary-50 rounded-lg transition-colors">
                {renderTemplateIcon(template)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                    {template.name}
                  </span>
                  {template.isOfficial && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                  {template.description}
                </p>
                {template.category && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                )}
              </div>
              <svg 
                className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {showAll && templates.length > 6 && (
          <button
            onClick={() => setShowAll(false)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Show less
          </button>
        )}
      </div>

      {selectedTemplate && (
        <TemplateDeployModal
          projectId={projectId}
          template={selectedTemplate}
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          onSuccess={() => {
            setSelectedTemplate(null);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
