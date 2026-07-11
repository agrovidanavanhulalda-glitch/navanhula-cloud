import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType2 } from 'lucide-react';
import { exportAll, ExportRow } from '@/lib/exporters';

interface Props {
  filename: string;
  title?: string;
  sheetName?: string;
  getRows: () => ExportRow[];
  disabled?: boolean;
}

export const ExportMenu: React.FC<Props> = ({ filename, title, sheetName, getRows, disabled }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" className="h-8 gap-1" disabled={disabled}>
        <Download className="h-3.5 w-3.5" /> Exportar
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="z-[1100]">
      <DropdownMenuItem onClick={() => exportAll('csv', getRows(), { filename, title, sheetName })}>
        <FileType2 className="h-4 w-4 mr-2" /> CSV
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportAll('xlsx', getRows(), { filename, title, sheetName })}>
        <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportAll('pdf', getRows(), { filename, title, sheetName })}>
        <FileText className="h-4 w-4 mr-2" /> PDF
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default ExportMenu;
