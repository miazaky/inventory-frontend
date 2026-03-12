interface Column<T> { key: string; header: string; render?: (row: T) => React.ReactNode; }
interface TableProps<T> {
  columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string;
  loading?: boolean; emptyMessage?: string;
}
export function Table<T>({ columns, data, keyExtractor, loading, emptyMessage = "No records found." }: TableProps<T>) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((col) => <th key={col.key}>{col.header}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} className="td-loading">Kraunama...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="td-empty">{emptyMessage}</td></tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
