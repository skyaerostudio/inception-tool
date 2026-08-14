import React, { useState, useEffect, useMemo } from 'react';
import { X, Filter, FileSpreadsheet, Copy, Check, Search, CheckSquare, Square, Layers, RefreshCw, Send, HelpCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fetchBatchProjectsData, generateGoogleSheetsClipboardText } from '../utils/batchExporter';
import { exportBatchSummaryToExcel } from '../utils/excelExport';

export const BatchExportModal = ({
  projectsList,
  divisions = [],
  squads = [],
  isCloud,
  onClose
}) => {
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedSquad, setSelectedSquad] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [exportMode, setExportMode] = useState('COMPILED_RKA'); // 'COMPILED_RKA' | 'SINGLE_SUMMARY'

  const [rawBatchData, setRawBatchData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showWebhookInput, setShowWebhookInput] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('idle');

  // Load all projects batch data on modal open
  useEffect(() => {
    let isMounted = true;
    const loadBatch = async () => {
      setIsLoadingData(true);
      try {
        const batch = await fetchBatchProjectsData(projectsList, isCloud, divisions, squads);
        if (isMounted) {
          setRawBatchData(batch);
          // Select all by default
          setSelectedProjectIds(new Set(batch.map(p => p.id)));
        }
      } catch (err) {
        console.error('Error fetching batch projects data:', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    loadBatch();
    return () => { isMounted = false; };
  }, [projectsList, isCloud, divisions, squads]);

  // Filtered project list based on dropdowns & search
  const filteredProjects = useMemo(() => {
    return rawBatchData.filter(p => {
      const matchDiv = selectedDivision === 'ALL' || p.divisionId === selectedDivision;
      const matchSquad = selectedSquad === 'ALL' || p.squadId === selectedSquad;
      const matchQuery = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchDiv && matchSquad && matchQuery;
    });
  }, [rawBatchData, selectedDivision, selectedSquad, searchQuery]);

  // Selected Projects dataset
  const activeSelectedProjects = useMemo(() => {
    return filteredProjects.filter(p => selectedProjectIds.has(p.id));
  }, [filteredProjects, selectedProjectIds]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalProjects = activeSelectedProjects.length;
    const totalMandays = activeSelectedProjects.reduce((sum, p) => sum + (p.totalMandays || 0), 0);
    
    const validStarts = activeSelectedProjects.map(p => p.plannedStartDate).filter(Boolean).sort();
    const validEnds = activeSelectedProjects.map(p => p.plannedEndDate).filter(Boolean).sort().reverse();

    const minStart = validStarts.length > 0 ? validStarts[0] : null;
    const maxEnd = validEnds.length > 0 ? validEnds[0] : null;

    const uniqueDivs = new Set(activeSelectedProjects.map(p => p.divisionName)).size;

    return { totalProjects, totalMandays, minStart, maxEnd, uniqueDivs };
  }, [activeSelectedProjects]);

  // Handle Checkboxes
  const toggleSelectProject = (id) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      filteredProjects.forEach(p => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      filteredProjects.forEach(p => next.delete(p.id));
      return next;
    });
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (activeSelectedProjects.length === 0) {
      alert('Please select at least one project to export.');
      return;
    }

    setIsExporting(true);
    try {
      const divName = selectedDivision === 'ALL' ? 'All Divisions' : (divisions.find(d => d.id === selectedDivision)?.name || 'All');
      const sqName = selectedSquad === 'ALL' ? 'All Squads' : (squads.find(s => s.id === selectedSquad)?.name || 'All');

      await exportBatchSummaryToExcel({
        projectsData: activeSelectedProjects,
        filterDivisionName: divName,
        filterSquadName: sqName,
        includeMilestones,
        exportMode
      });
    } catch (err) {
      console.error('Error generating Excel batch export:', err);
      alert('Failed to generate Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to Clipboard (Google Sheets TSV)
  const handleCopyGoogleSheets = () => {
    if (activeSelectedProjects.length === 0) {
      alert('Please select at least one project to copy.');
      return;
    }

    const tsv = generateGoogleSheetsClipboardText(activeSelectedProjects, includeMilestones);
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Send to Webhook (Google Apps Script / Webhook Endpoint)
  const handleSendWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a valid Google Apps Script Web App URL.');
      return;
    }

    setWebhookStatus('sending');
    try {
      const payload = {
        exportDate: new Date().toISOString(),
        totalProjects: activeSelectedProjects.length,
        totalMandays: summaryMetrics.totalMandays,
        projects: activeSelectedProjects.map(p => ({
          id: p.id,
          name: p.name,
          divisionName: p.divisionName,
          squadName: p.squadName,
          plannedStartDate: p.plannedStartDate,
          plannedEndDate: p.plannedEndDate,
          actualStartDate: p.actualStartDate,
          actualEndDate: p.actualEndDate,
          totalMandays: p.totalMandays,
          activityCount: p.activityCount,
          notes: p.notes,
          activities: (p.activities || []).map(a => ({
            name: a.name,
            mandays: a.mandays,
            startDate: a.startDate,
            endDate: a.endDate,
            actualStartDate: a.actualStartDate,
            actualEndDate: a.actualEndDate,
            pic: a.pic || '',
            remarks: a.remarks || ''
          }))
        }))
      };

      const params = new URLSearchParams();
      params.append('data', JSON.stringify(payload));

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        mode: 'no-cors'
      });

      setWebhookStatus('success');
      setTimeout(() => setWebhookStatus('idle'), 3000);
    } catch (err) {
      console.error('Webhook export error:', err);
      setWebhookStatus('error');
    }
  };

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-xl batch-export-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3>Batch Inception Summary Exporter</h3>
              <p className="subtitle">Filter, preview, and export inception summaries to Excel or Google Sheets</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Pre-Export Filter Bar */}
          <div className="batch-filter-toolbar">
            <div className="filter-group">
              <label><Filter size={14} /> Division Filter:</label>
              <select 
                value={selectedDivision} 
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="select-input"
              >
                <option value="ALL">All Divisions ({divisions.length})</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label><Layers size={14} /> Squad Filter:</label>
              <select 
                value={selectedSquad} 
                onChange={(e) => setSelectedSquad(e.target.value)}
                className="select-input"
              >
                <option value="ALL">All Squads ({squads.length})</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group search-group">
              <label><Search size={14} /> Search Project:</label>
              <input
                type="text"
                placeholder="Type project name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
              />
            </div>

            <div className="bulk-selection-actions">
              <button 
                type="button" 
                className="btn btn-secondary btn-xs"
                onClick={handleSelectAllFiltered}
              >
                <CheckSquare size={13} /> Select All
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-xs"
                onClick={handleDeselectAllFiltered}
              >
                <Square size={13} /> Deselect All
              </button>
            </div>
          </div>

          {/* Options & Settings Bar */}
          <div className="batch-options-bar">
            <div className="export-mode-selector">
              <span className="export-mode-label">Excel Export Format:</span>
              <label className="radio-label">
                <input
                  type="radio"
                  name="exportMode"
                  value="COMPILED_RKA"
                  checked={exportMode === 'COMPILED_RKA'}
                  onChange={() => setExportMode('COMPILED_RKA')}
                />
                <span><strong>Compiled Division RKA Format</strong> (Paired Squad Summary + Gantt Tabs)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="exportMode"
                  value="SINGLE_SUMMARY"
                  checked={exportMode === 'SINGLE_SUMMARY'}
                  onChange={() => setExportMode('SINGLE_SUMMARY')}
                />
                <span><strong>Single Flat Summary Sheet</strong></span>
              </label>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeMilestones}
                onChange={(e) => setIncludeMilestones(e.target.checked)}
              />
              <span>Include Milestone Breakdown</span>
            </label>
          </div>

          {/* Aggregate KPI Summary Header */}
          <div className="batch-kpi-cards">
            <div className="kpi-card">
              <span className="kpi-label">Selected Projects</span>
              <span className="kpi-value">{summaryMetrics.totalProjects} <small>/ {filteredProjects.length}</small></span>
            </div>
            <div className="kpi-card highlight">
              <span className="kpi-label">Total Combined Mandays</span>
              <span className="kpi-value">{summaryMetrics.totalMandays} <small>MD</small></span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Schedule Date Span</span>
              <span className="kpi-value text-sm">
                {summaryMetrics.minStart ? format(parseISO(summaryMetrics.minStart), 'dd MMM yyyy') : 'TBD'}
                {' → '}
                {summaryMetrics.maxEnd ? format(parseISO(summaryMetrics.maxEnd), 'dd MMM yyyy') : 'TBD'}
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Divisions Span</span>
              <span className="kpi-value">{summaryMetrics.uniqueDivs}</span>
            </div>
          </div>

          {/* Live Preview Container */}
          <div className="batch-preview-container">
            <div className="preview-header flex-between">
              <span className="preview-title">📑 Live Spreadsheet Export Preview</span>
              <span className="badge badge-info">Showing {activeSelectedProjects.length} of {rawBatchData.length} total projects</span>
            </div>

            {isLoadingData ? (
              <div className="preview-loading">
                <RefreshCw size={24} className="spin" />
                <p>Calculating batch inception summaries...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="empty-state">
                <p>No projects match your selected Division or Squad filter.</p>
              </div>
            ) : (
              <div className="preview-table-wrapper">
                <table className="batch-preview-table">
                  <thead>
                    <tr>
                      <th width="40" style={{ textAlign: 'center' }}>✓</th>
                      <th width="40">#</th>
                      <th>Project Name</th>
                      <th>Division</th>
                      <th>Squad</th>
                      <th>Planned Start</th>
                      <th>Target End</th>
                      <th>Actual Start</th>
                      <th>Actual End</th>
                      <th style={{ textAlign: 'center' }}>Mandays</th>
                      <th style={{ textAlign: 'center' }}>Activities</th>
                      {includeMilestones && <th>Milestones Breakdown</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((proj, idx) => {
                      const isChecked = selectedProjectIds.has(proj.id);
                      return (
                        <tr key={proj.id} className={!isChecked ? 'row-disabled' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectProject(proj.id)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td className="fw-bold text-primary">{proj.name}</td>
                          <td>
                            <span className="pill pill-div">{proj.divisionName}</span>
                          </td>
                          <td>
                            <span className="pill pill-squad">{proj.squadName}</span>
                          </td>
                          <td>{proj.plannedStartDate ? format(parseISO(proj.plannedStartDate), 'dd MMM yyyy') : '-'}</td>
                          <td>{proj.plannedEndDate ? format(parseISO(proj.plannedEndDate), 'dd MMM yyyy') : '-'}</td>
                          <td>
                            {proj.actualStartDate ? (
                              <span className="text-success">{format(parseISO(proj.actualStartDate), 'dd MMM yyyy')}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {proj.actualEndDate ? (
                              <span className="text-success">{format(parseISO(proj.actualEndDate), 'dd MMM yyyy')}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }} className="fw-bold">{proj.totalMandays}</td>
                          <td style={{ textAlign: 'center' }}>{proj.activityCount}</td>
                          {includeMilestones && (
                            <td className="milestones-preview-cell">
                              <ul className="milestone-bullets">
                                {proj.activities.map(a => (
                                  <li key={a.id}>
                                    <span className="m-name">{a.name}:</span>{' '}
                                    <span className="m-date">
                                      {a.startDate ? format(parseISO(a.startDate), 'dd MMM') : '?'} - {a.endDate ? format(parseISO(a.endDate), 'dd MMM') : '?'}
                                    </span>
                                    {(a.actualStartDate || a.actualEndDate) && (
                                      <span className="m-act-badge">
                                        (Act: {a.actualStartDate ? format(parseISO(a.actualStartDate), 'dd MMM') : '-'} to {a.actualEndDate ? format(parseISO(a.actualEndDate), 'dd MMM') : '-'})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan="9" style={{ textAlign: 'right', fontWeight: 'bold' }}>CONSOLIDATED TOTAL:</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#4F46E5' }}>{summaryMetrics.totalMandays} MD</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {activeSelectedProjects.reduce((sum, p) => sum + p.activityCount, 0)}
                      </td>
                      {includeMilestones && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Webhook Drawer Toggle */}
          {showWebhookInput && (
            <div className="webhook-drawer">
              <div className="flex-between">
                <label className="fw-bold">🌐 Direct Google Apps Script Webhook Endpoint URL:</label>
                <button type="button" className="btn-icon" onClick={() => setShowWebhookInput(false)}>
                  <X size={14} />
                </button>
              </div>
              <p className="text-muted text-xs">
                Paste your deployed Google Apps Script Web App URL to push this dataset directly into a live Google Spreadsheet.
              </p>
              <div className="webhook-setup-notice" style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '8px 12px', fontSize: '0.78rem', color: '#92400e', marginBottom: '10px' }}>
                <strong>⚠️ Fix 401 Unauthorized Error:</strong> When deploying your Google Apps Script Web App, set <u>"Execute as"</u> to <strong>Me</strong> and <u>"Who has access"</u> to <strong>Anyone</strong> (Siapa saja). Otherwise Google will block external POST requests.
              </div>
              <div className="webhook-input-group">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="text-input"
                />
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSendWebhook}
                  disabled={webhookStatus === 'sending'}
                >
                  <Send size={16} />
                  {webhookStatus === 'sending' ? 'Syncing...' : 'Sync Data'}
                </button>
              </div>
              {webhookStatus === 'success' && <div className="alert-success-text">✓ Data successfully sent to Google Apps Script endpoint!</div>}
              {webhookStatus === 'error' && <div className="alert-error-text">❌ Failed to send data. Please verify your Web App URL.</div>}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="modal-footer flex-between">
          <div className="footer-left-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setShowWebhookInput(!showWebhookInput)}
            >
              <Send size={16} />
              <span>{showWebhookInput ? 'Hide Webhook Sync' : 'Google Sheets Webhook Sync'}</span>
            </button>
          </div>

          <div className="footer-right-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>

            <button 
              className="btn btn-secondary btn-google"
              onClick={handleCopyGoogleSheets}
              disabled={activeSelectedProjects.length === 0}
              title="Copy formatted spreadsheet data to paste directly into Google Sheets"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? 'Copied for Google Sheets!' : 'Copy for Google Sheets'}</span>
            </button>

            <button 
              className="btn btn-primary"
              onClick={handleExportExcel}
              disabled={isExporting || activeSelectedProjects.length === 0}
            >
              <FileSpreadsheet size={18} />
              <span>{isExporting ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
