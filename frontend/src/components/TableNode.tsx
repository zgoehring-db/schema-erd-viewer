import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Key, Link, RefreshCw } from 'lucide-react';
import type { Column } from '../types';

interface TableNodeData {
  label: string;
  tableType: string;
  tags?: Record<string, string> | null;
  columns: Column[];
  [key: string]: unknown;
}

function getHeaderStyle(tableType: string) {
  const t = tableType.toUpperCase();
  if (t === 'VIEW')
    return { bg: 'bg-emerald-600', badge: 'bg-emerald-500', border: 'border-emerald-300' };
  if (t === 'MATERIALIZED_VIEW')
    return { bg: 'bg-purple-600', badge: 'bg-purple-500', border: 'border-purple-300' };
  return { bg: 'bg-blue-600', badge: 'bg-blue-500', border: 'border-gray-200' };
}

function getDisplayType(tableType: string) {
  const t = tableType.toUpperCase();
  if (t === 'MANAGED' || t === 'EXTERNAL') return 'TABLE';
  if (t === 'MATERIALIZED_VIEW') return 'MAT VIEW';
  return t;
}

const TAG_ICONS: Record<string, typeof RefreshCw> = {
  update_frequency: RefreshCw,
};

function TableNode({ data }: { data: TableNodeData }) {
  const style = getHeaderStyle(data.tableType);
  const tags = data.tags || {};
  const tagEntries = Object.entries(tags).filter(([key]) => key === 'update_frequency');

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${style.border} min-w-[260px] overflow-hidden`}>
      {/* Table header */}
      <div className={`${style.bg} text-white px-3 py-2 font-semibold text-sm flex items-center justify-between`}>
        <span className="truncate">{data.label}</span>
        <span className={`text-[10px] ${style.badge} px-1.5 py-0.5 rounded ml-2 whitespace-nowrap flex-shrink-0`}>
          {getDisplayType(data.tableType)}
        </span>
      </div>

      {/* Tags bar */}
      {tagEntries.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-1 flex flex-wrap gap-1.5">
          {tagEntries.map(([key, value]) => {
            const Icon = TAG_ICONS[key] || RefreshCw;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded"
                title={`${key}: ${value}`}
              >
                <Icon size={9} />
                <span className="text-gray-400">{key.replace(/_/g, ' ')}:</span>
                <span className="font-medium">{value}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Columns - each with its own handles */}
      <div className="divide-y divide-gray-100">
        {data.columns.map((col) => (
          <div
            key={col.name}
            className={`relative px-3 py-1.5 flex items-center text-xs gap-2 ${
              col.isPK ? 'bg-yellow-50' : col.isFK ? 'bg-blue-50' : ''
            }`}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.name}-target`}
              className="!bg-blue-500 !w-1.5 !h-1.5 !min-w-0 !min-h-0"
              style={{ top: '50%' }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.name}-source`}
              className="!bg-blue-500 !w-1.5 !h-1.5 !min-w-0 !min-h-0"
              style={{ top: '50%' }}
            />
            <span className="w-4 flex-shrink-0">
              {col.isPK && <Key size={12} className="text-yellow-600" />}
              {col.isFK && !col.isPK && <Link size={12} className="text-blue-500" />}
            </span>
            <span className={`flex-1 truncate ${col.isPK ? 'font-semibold' : ''}`}>
              {col.name}
            </span>
            <span className="text-gray-400 text-[10px] flex-shrink-0 uppercase">
              {col.type}
            </span>
            {col.nullable && (
              <span className="text-gray-300 text-[10px]">NULL</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TableNode);
