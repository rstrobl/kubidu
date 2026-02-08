import { useRef } from 'react';
import { EnvironmentVariable, SharedVarSource } from './types';
import { useEnvVarAutocomplete } from '../../hooks/useEnvVarAutocomplete';
import { EnvVarAutocomplete } from '../EnvVarAutocomplete';
import { EnvVarValueDisplay } from '../EnvVarValueDisplay';

// Sub-component for editing env var rows (needed for hooks inside .map())
interface EnvVarEditRowProps {
  envVar: EnvironmentVariable;
  isEditing: boolean;
  editValue: string;
  editIsSecret: boolean;
  envLoading: boolean;
  copiedEnvId: string | null;
  sharedVars: SharedVarSource[];
  resolvedValues: Record<string, string>;
  onEditValueChange: (value: string) => void;
  onEditIsSecretChange: (checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleShared: () => void;
  onCopy: () => void;
}

function EnvVarEditRow({
  envVar,
  isEditing,
  editValue,
  editIsSecret,
  envLoading,
  copiedEnvId,
  sharedVars,
  resolvedValues,
  onEditValueChange,
  onEditIsSecretChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onToggleShared,
  onCopy,
}: EnvVarEditRowProps) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const editAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: editInputRef });

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <div className="font-medium text-sm text-gray-900 mb-2">
              {envVar.key}
            </div>
            <div className="relative">
              <input
                ref={editInputRef}
                type={editIsSecret ? 'password' : 'text'}
                value={editValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  onEditValueChange(e.target.value);
                  editAutocomplete.handleInputChange(e);
                }}
                onKeyDown={editAutocomplete.handleKeyDown}
                className="input w-full"
                placeholder='Value or ${{ to reference'
                autoFocus
              />
              <EnvVarAutocomplete
                isOpen={editAutocomplete.isOpen}
                groupedItems={editAutocomplete.groupedItems}
                activeIndex={editAutocomplete.activeIndex}
                onSelect={editAutocomplete.selectItem}
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`edit-secret-${envVar.id}`}
              checked={editIsSecret}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEditIsSecretChange(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor={`edit-secret-${envVar.id}`} className="ml-2 block text-sm text-gray-700">
              Mark as secret
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="btn btn-primary text-sm"
              disabled={envLoading}
            >
              {envLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="font-mono text-sm font-medium text-gray-900 shrink-0">
              {envVar.key}
            </div>
            {envVar.reference ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {envVar.reference.sourceServiceName}
                </span>
                <div className="truncate">
                  <EnvVarValueDisplay value={envVar.value} isSecret={envVar.isSecret} resolvedValues={resolvedValues} />
                </div>
              </div>
            ) : (
              <div className="truncate">
                <EnvVarValueDisplay value={envVar.value} isSecret={envVar.isSecret} resolvedValues={resolvedValues} />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onToggleShared}
              className={`p-1.5 rounded transition-colors ${envVar.isShared ? 'bg-teal-100 hover:bg-teal-200' : 'hover:bg-gray-200'}`}
              title={envVar.isShared ? 'Shared with other services (click to unshare)' : 'Share with other services'}
            >
              <svg className={`w-4 h-4 ${envVar.isShared ? 'text-teal-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {!envVar.isSecret && envVar.value && (
              <button
                onClick={onCopy}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Copy value"
              >
                {copiedEnvId === envVar.id ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Edit variable"
            >
              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Delete variable"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EnvVarsTabProps {
  envVars: EnvironmentVariable[];
  sharedVars: SharedVarSource[];
  resolvedValues: Record<string, string>;
  showEnvForm: boolean;
  envKey: string;
  envValue: string;
  envIsSecret: boolean;
  envLoading: boolean;
  editingEnvId: string | null;
  editEnvValue: string;
  editEnvIsSecret: boolean;
  rawEditMode: boolean;
  rawEnvText: string;
  copiedEnvId: string | null;
  addValueRef: React.RefObject<HTMLInputElement>;
  batchTextareaRef: React.RefObject<HTMLTextAreaElement>;
  onShowEnvFormChange: (show: boolean) => void;
  onEnvKeyChange: (key: string) => void;
  onEnvValueChange: (value: string) => void;
  onEnvIsSecretChange: (isSecret: boolean) => void;
  onAddEnvVar: () => void;
  onEditEnvVar: (envVar: EnvironmentVariable) => void;
  onSaveEnvVar: (envVar: EnvironmentVariable) => void;
  onCancelEdit: () => void;
  onDeleteEnvVar: (varId: string) => void;
  onToggleRawEdit: () => void;
  onRawEnvTextChange: (text: string) => void;
  onSaveRawEnv: () => void;
  onEditValueChange: (value: string) => void;
  onEditIsSecretChange: (isSecret: boolean) => void;
  onToggleShared: (envVar: EnvironmentVariable) => void;
  onCopyEnvValue: (envVar: EnvironmentVariable) => void;
}

export function EnvVarsTab({
  envVars,
  sharedVars,
  resolvedValues,
  showEnvForm,
  envKey,
  envValue,
  envIsSecret,
  envLoading,
  editingEnvId,
  editEnvValue,
  editEnvIsSecret,
  rawEditMode,
  rawEnvText,
  copiedEnvId,
  addValueRef,
  batchTextareaRef,
  onShowEnvFormChange,
  onEnvKeyChange,
  onEnvValueChange,
  onEnvIsSecretChange,
  onAddEnvVar,
  onEditEnvVar,
  onSaveEnvVar,
  onCancelEdit,
  onDeleteEnvVar,
  onToggleRawEdit,
  onRawEnvTextChange,
  onSaveRawEnv,
  onEditValueChange,
  onEditIsSecretChange,
  onToggleShared,
  onCopyEnvValue,
}: EnvVarsTabProps) {
  // Autocomplete hooks for add form and batch edit
  const addAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: addValueRef });
  const batchAutocomplete = useEnvVarAutocomplete({ sharedVars, inputRef: batchTextareaRef });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Environment Variables</h2>
            <p className="text-xs text-gray-500 mt-1">
              Type <code className="bg-gray-100 px-1 rounded">{"${{"}</code> in a value field to reference variables from other services.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onToggleRawEdit}
              className="btn btn-secondary"
            >
              {rawEditMode ? 'Cancel' : 'Batch Edit'}
            </button>
            <button
              onClick={() => onShowEnvFormChange(!showEnvForm)}
              className="btn btn-primary"
            >
              {showEnvForm ? 'Cancel' : 'Add Variable'}
            </button>
          </div>
        </div>

        {rawEditMode && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Edit environment variables in KEY=VALUE format (one per line). This will update or create variables.
            </p>
            <div className="relative">
              <textarea
                ref={batchTextareaRef}
                value={rawEnvText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  onRawEnvTextChange(e.target.value);
                  batchAutocomplete.handleInputChange(e);
                }}
                onKeyDown={batchAutocomplete.handleKeyDown}
                className="input font-mono text-sm"
                rows={10}
                placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=${{OtherService.API_KEY}}\nPORT=3000"}
              />
              <EnvVarAutocomplete
                isOpen={batchAutocomplete.isOpen}
                groupedItems={batchAutocomplete.groupedItems}
                activeIndex={batchAutocomplete.activeIndex}
                onSelect={batchAutocomplete.selectItem}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={onToggleRawEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveRawEnv}
                className="btn btn-primary"
                disabled={envLoading}
              >
                {envLoading ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        )}

        {showEnvForm && !rawEditMode && (
          <form onSubmit={(e) => { e.preventDefault(); onAddEnvVar(); }} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key
                </label>
                <input
                  type="text"
                  value={envKey}
                  onChange={(e) => onEnvKeyChange(e.target.value)}
                  className="input"
                  placeholder="e.g., DATABASE_URL"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <div className="relative">
                  <input
                    ref={addValueRef}
                    type={envIsSecret ? 'password' : 'text'}
                    value={envValue}
                    onChange={(e) => {
                      onEnvValueChange(e.target.value);
                      addAutocomplete.handleInputChange(e);
                    }}
                    onKeyDown={addAutocomplete.handleKeyDown}
                    className="input w-full"
                    placeholder='Value or ${{ to reference'
                    required
                  />
                  <EnvVarAutocomplete
                    isOpen={addAutocomplete.isOpen}
                    groupedItems={addAutocomplete.groupedItems}
                    activeIndex={addAutocomplete.activeIndex}
                    onSelect={addAutocomplete.selectItem}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSecret"
                  checked={envIsSecret}
                  onChange={(e) => onEnvIsSecretChange(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isSecret" className="ml-2 block text-sm text-gray-700">
                  Mark as secret (hidden in UI)
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    onShowEnvFormChange(false);
                    onEnvKeyChange('');
                    onEnvValueChange('');
                    onEnvIsSecretChange(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={envLoading}
                >
                  {envLoading ? 'Adding...' : 'Add Variable'}
                </button>
              </div>
            </div>
          </form>
        )}

        {envVars.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No environment variables configured
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Variables Section - Show First */}
            {envVars.filter((v) => !v.isSystem).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">User Variables</h3>
                <div className="space-y-2">
                  {envVars.filter((v) => !v.isSystem).map((envVar) => (
                    <EnvVarEditRow
                      key={envVar.id}
                      envVar={envVar}
                      isEditing={editingEnvId === envVar.id}
                      editValue={editEnvValue}
                      editIsSecret={editEnvIsSecret}
                      envLoading={envLoading}
                      copiedEnvId={copiedEnvId}
                      sharedVars={sharedVars}
                      resolvedValues={resolvedValues}
                      onEditValueChange={onEditValueChange}
                      onEditIsSecretChange={onEditIsSecretChange}
                      onSave={() => onSaveEnvVar(envVar)}
                      onCancel={onCancelEdit}
                      onEdit={() => onEditEnvVar(envVar)}
                      onDelete={() => onDeleteEnvVar(envVar.id)}
                      onToggleShared={() => onToggleShared(envVar)}
                      onCopy={() => onCopyEnvValue(envVar)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* System Variables Section - Show Second */}
            {envVars.filter((v) => v.isSystem).length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">System Variables (Read-Only)</h3>
                </div>
                <div className="space-y-2 mb-6">
                  {envVars.filter((v) => v.isSystem).map((envVar) => (
                    <div key={envVar.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="font-mono text-sm font-medium text-blue-900 shrink-0">
                            {envVar.key}
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                            Auto-managed
                          </span>
                          <div className="text-sm text-blue-700 font-mono truncate">
                            {envVar.value || '(value hidden)'}
                          </div>
                        </div>
                        {envVar.value && (
                          <button
                            onClick={() => onCopyEnvValue(envVar)}
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors shrink-0"
                            title="Copy value"
                          >
                            {copiedEnvId === envVar.id ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
