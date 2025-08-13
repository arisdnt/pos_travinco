import ExcelJS from 'exceljs';

type ColumnDef = { header: string; key: string; width?: number };

export async function exportToXlsx(
  fileName: string,
  options: {
    sheetName?: string;
    columns: ColumnDef[];
    rows: Record<string, any>[];
  }
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName || 'Data', {
    properties: { defaultRowHeight: 18 }
  });

  // Columns
  sheet.columns = options.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // blue-600
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Rows
  options.rows.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'middle' };
    // Zebra striping
    const isEven = idx % 2 === 1;
    r.eachCell((cell) => {
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // slate-50
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Auto-filter
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: options.columns.length } };

  // Generate blob and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

