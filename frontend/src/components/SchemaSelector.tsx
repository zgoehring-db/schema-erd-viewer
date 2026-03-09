import { ChevronDown, Database, Loader2 } from 'lucide-react';

interface SchemaSelectorProps {
  catalogs: { name: string }[];
  schemas: { name: string }[];
  selectedCatalog: string;
  selectedSchema: string;
  onCatalogChange: (catalog: string) => void;
  onSchemaChange: (schema: string) => void;
  catalogsLoading: boolean;
  schemasLoading: boolean;
}

export default function SchemaSelector({
  catalogs,
  schemas,
  selectedCatalog,
  selectedSchema,
  onCatalogChange,
  onSchemaChange,
  catalogsLoading,
  schemasLoading,
}: SchemaSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Database size={18} className="text-blue-600" />

      <div className="relative">
        <select
          value={selectedCatalog}
          onChange={(e) => onCatalogChange(e.target.value)}
          disabled={catalogsLoading}
          className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          <option value="">Select catalog...</option>
          {catalogs.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      <span className="text-gray-400">.</span>

      <div className="relative">
        <select
          value={selectedSchema}
          onChange={(e) => onSchemaChange(e.target.value)}
          disabled={!selectedCatalog || schemasLoading}
          className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          <option value="">Select schema...</option>
          {schemas.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {(catalogsLoading || schemasLoading) && (
        <Loader2 size={16} className="text-blue-500 animate-spin" />
      )}
    </div>
  );
}
