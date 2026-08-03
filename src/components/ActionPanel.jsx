import React, { useState } from 'react';
import { Copy, RotateCcw, Check, Printer, FileSpreadsheet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { exportProjectToExcel } from '../utils/excelExport';

export const ActionPanel = ({
  projectInfo,
  activities,
  resetData,
  divisions,
  squads,
  users = [],
  roles = [],
  onOpenBatchExport
}) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleCopy = () => {
    let summary = `Project: ${projectInfo.name}\n\n`;
    activities.forEach((act, idx) => {
      const start = act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : 'TBD';
      const end = act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : 'TBD';
      const picIds = Array.isArray(act.picIds) && act.picIds.length > 0 ? act.picIds : (act.picId ? [act.picId] : []);
      const picNames = picIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
      const picStr = picNames.length > 0 ? ` (PIC: ${picNames.join(', ')})` : '';
      const statusStr = act.status ? ` [${act.status}]` : '';
      summary += `${idx + 1}. ${act.name}${statusStr}${picStr}: ${start} - ${end}, ${act.mandays} mandays\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportProjectToExcel(projectInfo, activities, divisions, squads, users, roles);
    } catch (err) {
      console.error('Failed to export to Excel', err);
      alert('Failed to generate Excel file.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="action-panel no-print">
      <button className="btn btn-secondary" onClick={resetData}>
        <RotateCcw size={18} />
        Reset Planning Data
      </button>
      <button className="btn btn-secondary" onClick={() => window.print()}>
        <Printer size={18} />
        Export PDF / Print
      </button>
      <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exporting}>
        <FileSpreadsheet size={18} />
        {exporting ? 'Exporting...' : 'Export Excel'}
      </button>
      <button className="btn btn-secondary btn-batch-highlight" onClick={onOpenBatchExport}>
        <FileSpreadsheet size={18} />
        Batch Export Summaries
      </button>
      <button className="btn btn-primary" onClick={handleCopy}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? 'Copied!' : 'Copy Summary'}
      </button>
    </div>
  );
};
