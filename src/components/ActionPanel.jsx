import React, { useState } from 'react';
import { Copy, RotateCcw, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const ActionPanel = ({ projectInfo, activities, resetData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let summary = `Project: ${projectInfo.name}\n\n`;
    activities.forEach((act, idx) => {
      const start = act.startDate ? format(parseISO(act.startDate), 'dd MMM yyyy') : 'TBD';
      const end = act.endDate ? format(parseISO(act.endDate), 'dd MMM yyyy') : 'TBD';
      summary += `${idx + 1}. ${act.name}: ${start} - ${end}, ${act.mandays} mandays\n`;
    });

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="action-panel">
      <button className="btn btn-secondary" onClick={resetData}>
        <RotateCcw size={18} />
        Reset Planning Data
      </button>
      <button className="btn btn-primary" onClick={handleCopy}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? 'Copied!' : 'Copy Summary'}
      </button>
    </div>
  );
};
