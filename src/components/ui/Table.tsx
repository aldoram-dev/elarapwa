import React from 'react'
import { cn } from '@lib/utils'

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div 
      className="w-full overflow-auto rounded-3xl border-2 border-white/40 bg-white/20 backdrop-blur-3xl"
      style={{
        boxShadow: '0 8px 32px rgba(51, 65, 85, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
      }}
    >
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
)

Table.displayName = 'Table'

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('backdrop-blur-xl border-b-2 border-white/30', className)}
      style={{ backgroundColor: '#334155', boxShadow: '0 4px 16px -2px rgba(51, 65, 85, 0.3)' }}
      {...props}
    >
      {children}
    </thead>
  )
)

TableHeader.displayName = 'TableHeader'

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('divide-y divide-slate-100', className)}
      {...props}
    >
      {children}
    </tbody>
  )
)

TableBody.displayName = 'TableBody'

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-all duration-300 hover:bg-white/30 hover:backdrop-blur-xl',
        'data-[state=selected]:bg-slate-300/30',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
)

TableRow.displayName = 'TableRow'

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-14 px-5 text-left align-middle font-bold text-white text-xs uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
)

TableHead.displayName = 'TableHead'

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-5 py-4 align-middle text-slate-900 font-medium', className)}
      {...props}
    >
      {children}
    </td>
  )
)

TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
