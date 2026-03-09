import { useState } from 'react';
import { useCatalogs, useSchemas, useERDData } from './hooks/useSchemaData';
import SchemaSelector from './components/SchemaSelector';
import ERDCanvas from './components/ERDCanvas';
import { Loader2, AlertCircle, TableProperties } from 'lucide-react';

export default function App() {
  const [catalog, setCatalog] = useState('');
  const [schema, setSchema] = useState('');

  const { catalogs, loading: catalogsLoading } = useCatalogs();
  const { schemas, loading: schemasLoading } = useSchemas(catalog);
  const { data, loading: erdLoading, error } = useERDData(catalog, schema);

  const handleCatalogChange = (val: string) => {
    setCatalog(val);
    setSchema('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <TableProperties size={22} className="text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-800">Schema ERD Viewer</h1>
        </div>
        <SchemaSelector
          catalogs={catalogs}
          schemas={schemas}
          selectedCatalog={catalog}
          selectedSchema={schema}
          onCatalogChange={handleCatalogChange}
          onSchemaChange={setSchema}
          catalogsLoading={catalogsLoading}
          schemasLoading={schemasLoading}
        />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {erdLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-10">
            <div className="flex items-center gap-3 bg-white rounded-lg shadow-md px-6 py-4">
              <Loader2 size={20} className="text-blue-500 animate-spin" />
              <span className="text-gray-600">Loading schema...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-6 py-4 max-w-md">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {!catalog || !schema ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TableProperties size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a catalog and schema to visualize</p>
              <p className="text-sm mt-1">Tables, columns, and relationships will be rendered as an ERD</p>
            </div>
          </div>
        ) : data && !erdLoading ? (
          data.tables.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg">No tables found in {catalog}.{schema}</p>
              </div>
            </div>
          ) : (
            <ERDCanvas data={data} />
          )
        ) : null}
      </div>
    </div>
  );
}
