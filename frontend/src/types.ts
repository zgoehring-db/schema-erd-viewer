export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPK: boolean;
  isFK: boolean;
}

export interface Table {
  name: string;
  type: string;
  tags?: Record<string, string> | null;
  columns: Column[];
}

export interface Relationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  constraintName: string;
}

export interface ERDData {
  tables: Table[];
  relationships: Relationship[];
}

export interface TableNodeData {
  label: string;
  tableType: string;
  columns: Column[];
}
