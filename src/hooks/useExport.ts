import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: (value: any, row: any) => string;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: { row: number; field: string; message: string }[];
  totalRows: number;
  validRows: number;
}

export const useExport = () => {
  // Export to Excel (.xlsx)
  const exportToExcel = <T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions
  ) => {
    try {
      // Transform data using column formatters
      const transformedData = data.map(row => {
        const newRow: Record<string, any> = {};
        columns.forEach(col => {
          const value = row[col.key];
          newRow[col.header] = col.format ? col.format(value, row) : value ?? '';
        });
        return newRow;
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(transformedData);
      
      // Set column widths
      const colWidths = columns.map(col => ({ wch: col.width || 15 }));
      worksheet['!cols'] = colWidths;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

      // Generate file
      XLSX.writeFile(workbook, `${options.filename}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  // Export to CSV
  const exportToCSV = <T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions
  ) => {
    try {
      // Create CSV content
      const headers = columns.map(col => col.header).join(',');
      const rows = data.map(row => 
        columns.map(col => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value, row) : value ?? '';
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(formatted);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      const csvContent = [headers, ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${options.filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar CSV');
    }
  };

  // Export to PDF
  const exportToPDF = <T extends Record<string, any>>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions
  ) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Title
      if (options.title) {
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(options.title, 14, 22);
      }
      
      // Subtitle
      if (options.subtitle) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(options.subtitle, 14, 30);
      }

      // Transform data
      const tableData = data.map(row => 
        columns.map(col => {
          const value = row[col.key];
          return col.format ? col.format(value, row) : value ?? '';
        })
      );

      const tableHeaders = columns.map(col => col.header);

      // Create table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: options.title ? 40 : 20,
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: columns.reduce((acc, col, idx) => {
          if (col.width) {
            acc[idx] = { cellWidth: col.width * 2.5 };
          }
          return acc;
        }, {} as Record<number, { cellWidth: number }>),
      });

      // Save
      doc.save(`${options.filename}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  // Parse Excel/CSV file for import
  const parseImportFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  // Validate import data
  const validateImportData = <T>(
    data: any[],
    columnMapping: Record<string, string>,
    validators: Record<string, (value: any) => string | null>
  ): ImportResult<T> => {
    const errors: { row: number; field: string; message: string }[] = [];
    const validData: T[] = [];

    data.forEach((row, index) => {
      const mappedRow: Record<string, any> = {};
      let rowValid = true;

      Object.entries(columnMapping).forEach(([sourceCol, targetField]) => {
        const value = row[sourceCol];
        mappedRow[targetField] = value;

        // Run validator if exists
        if (validators[targetField]) {
          const error = validators[targetField](value);
          if (error) {
            errors.push({ row: index + 2, field: targetField, message: error });
            rowValid = false;
          }
        }
      });

      if (rowValid) {
        validData.push(mappedRow as T);
      }
    });

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      totalRows: data.length,
      validRows: validData.length,
    };
  };

  return {
    exportToExcel,
    exportToCSV,
    exportToPDF,
    parseImportFile,
    validateImportData,
  };
};
