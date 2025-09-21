import React from 'react';
import { AuditLog, ProgramStatus, UserStatus, EnrollmentStatus } from '../types';
import { XIcon } from './icons/Icons';

interface AuditLogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
  userMap: Map<string, string>;
  programMap: Map<string, string>;
  categoryMap: Map<string, string>;
}

const getStatusBadge = (key: string, value: any) => {
    const commonClasses = 'px-2 py-0.5 text-xs font-medium rounded-full inline-block';
    if (key.toLowerCase().includes('status')) {
        switch(value) {
            case UserStatus.ACTIVE:
            case ProgramStatus.ACTIVE:
            case EnrollmentStatus.ACTIVE:
                 return <span className={`${commonClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>{value}</span>;
            case UserStatus.INACTIVE:
                 return <span className={`${commonClasses} bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300`}>{value}</span>;
            case ProgramStatus.DRAFT:
                return <span className={`${commonClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>{value}</span>;
            case ProgramStatus.ARCHIVED:
            case EnrollmentStatus.CANCELLED:
            case EnrollmentStatus.COMPLETED:
                return <span className={`${commonClasses} bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>{value}</span>;
            default:
                return value;
        }
    }
    return value;
}


const renderValue = (key: string, value: any, maps: { userMap: Map<string, string>, programMap: Map<string, string>, categoryMap: Map<string, string> }): React.ReactNode => {
    if (typeof value === 'boolean') {
        return value ? 'Enabled' : 'Disabled';
    }
    if (value === null || value === undefined || value === '') {
        return <span className="italic text-gray-400">Not set</span>;
    }
    if (key === 'categoryId') {
        return maps.categoryMap.get(value) || value;
    }
    if (key.endsWith('Id') || key.endsWith('Ids')) {
        if (Array.isArray(value)) {
            return value.map(id => maps.userMap.get(id) || maps.programMap.get(id) || id).join(', ');
        }
        return maps.userMap.get(value) || maps.programMap.get(value) || value;
    }
    if (key.toLowerCase().includes('status')) {
        return getStatusBadge(key, value);
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
     // FIX: Use JSON.stringify for better object readability
     if (typeof value === 'object') {
        return <pre className="whitespace-pre-wrap font-sans text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
    }
    return String(value);
};

const formatFieldName = (fieldName: string) => {
    return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
};

const AuditLogDetailsModal: React.FC<AuditLogDetailsModalProps> = ({ isOpen, onClose, log, userMap, programMap, categoryMap }) => {
  if (!isOpen || !log) return null;

  const { details, action } = log;
  const isUpdate = (action.includes('UPDATED') || action.includes('CHANGE') || action.includes('ACTIVATED') || action.includes('DEACTIVATED')) && details.previousState && details.changes;

  const renderComparisonView = () => {
    const { previousState, changes } = details;
    const allKeys = Array.from(new Set([...Object.keys(previousState), ...Object.keys(changes)]));
    
    const relevantKeys = allKeys.filter(key => {
        const ignoreKeys = ['id', 'history', 'structure', 'lastLogin', 'dateAdded', 'documents', 'avatar', 'childrenIds', 'performanceNotes', 'notificationPreferences', 'password', 'payRate', 'experiencePoints', 'aiProvider', 'aiBriefing', 'studentAtRisk', 'aiChat'];
        if (ignoreKeys.includes(key)) return false;
        
        return JSON.stringify(previousState[key]) !== JSON.stringify(changes[key]);
    });

    if (relevantKeys.length === 0) {
        return <p className="text-sm text-center text-gray-500 italic p-4">No simple field changes detected. The update may involve complex data not shown here.</p>;
    }

    return (
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase">Field</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase">Previous Value</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase">New Value</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {relevantKeys.map(key => (
            <tr key={key}>
              <td className="px-4 py-3 font-semibold">{formatFieldName(key)}</td>
              <td className="px-4 py-3">{renderValue(key, previousState[key], { userMap, programMap, categoryMap })}</td>
              <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{renderValue(key, changes[key], { userMap, programMap, categoryMap })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSimpleView = () => (
    <div className="space-y-2">
        {Object.keys(details).length > 0 ? Object.entries(details).map(([key, value]) => (
            <div key={key} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <p className="text-xs font-bold uppercase text-gray-500">{formatFieldName(key)}</p>
                <div className="mt-1 text-sm">{renderValue(key, value, { userMap, programMap, categoryMap })}</div>
            </div>
        )) : <p className="text-sm text-center text-gray-500 italic p-4">No additional details for this event.</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <div>
                <h3 className="text-lg font-semibold">Log Details</h3>
                <p className="text-sm text-gray-500">{log.action}</p>
            </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
        </div>
        <div className="p-4 flex-shrink-0 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="font-semibold">Timestamp:</div><div>{new Date(log.timestamp).toLocaleString()}</div>
                <div className="font-semibold">User:</div><div>{log.userName}</div>
                <div className="font-semibold">Entity:</div><div>{log.entityType}: {log.entityId}</div>
            </dl>
        </div>
        <div className="p-4 flex-grow overflow-y-auto">
          {isUpdate ? renderComparisonView() : renderSimpleView()}
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailsModal;