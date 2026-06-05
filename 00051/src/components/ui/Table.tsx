import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

const Table = ({ children, className }: TableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-slate-200', className)}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

Table.Header = ({ children, className }: TableHeaderProps) => (
  <thead className={cn('bg-slate-50', className)}>{children}</thead>
);

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

Table.Body = ({ children, className }: TableBodyProps) => (
  <tbody className={cn('bg-white divide-y divide-slate-200', className)}>
    {children}
  </tbody>
);

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

Table.Row = ({ children, className, hover = true }: TableRowProps) => (
  <tr className={cn(hover && 'hover:bg-slate-50 transition-colors', className)}>
    {children}
  </tr>
);

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
  title?: string;
  colSpan?: number;
}

Table.Cell = ({ children, className, header = false, title, colSpan }: TableCellProps) => {
  if (header) {
    return (
      <th
        className={cn(
          'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
          className
        )}
        colSpan={colSpan}
      >
        {children}
      </th>
    );
  }
  return (
    <td 
      className={cn('px-4 py-3 text-sm text-slate-700 whitespace-nowrap', className)}
      title={title}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
};

export default Table;
