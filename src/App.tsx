import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ResumeScreening from './components/ResumeScreening';
import DatasetScanner from './components/DatasetScanner';
import DecisionAudit, { AuditResult } from './components/DecisionAudit';
import Checklist, { ChecklistResult } from './components/Checklist';
import { Trash2 } from 'lucide-react';

export type ModuleType = 'landing' | 'resume' | 'dataset' | 'decision' | 'checklist';

interface HistoryRecord {
  id: string;
  time: string;
  module: string;
  score: string | number;
  verdict: string;
}

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleType>('landing');
  const [checklistResult, setChecklistResult] = useState<ChecklistResult | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('auditHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const addHistory = (record: Omit<HistoryRecord, 'id' | 'time'>) => {
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const newHistory = [newRecord, ...history];
    setHistory(newHistory);
    localStorage.setItem('auditHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('auditHistory');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white flex flex-col">
      <div className="flex-1">
        {currentModule === 'landing' && (
          <LandingPage onSelectModule={setCurrentModule} />
        )}
        {currentModule === 'resume' && (
          <ResumeScreening 
            onBack={() => setCurrentModule('landing')} 
            onAuditComplete={(score, verdict) => addHistory({ module: 'Hiring', score, verdict })}
          />
        )}
        {currentModule === 'dataset' && (
          <DatasetScanner 
            onBack={() => setCurrentModule('landing')} 
            onAuditComplete={(score, verdict) => addHistory({ module: 'Dataset', score, verdict })}
          />
        )}
        {currentModule === 'decision' && (
          <DecisionAudit 
            onBack={() => setCurrentModule('landing')} 
            checklistResult={checklistResult}
            onAuditComplete={(score, verdict) => addHistory({ module: 'Decision', score, verdict })}
          />
        )}
        {currentModule === 'checklist' && (
          <Checklist 
            onBack={() => setCurrentModule('landing')} 
            onChecklistComplete={(result) => {
              setChecklistResult(result);
              addHistory({ module: 'Checklist', score: 'N/A', verdict: result.readiness });
            }}
          />
        )}
      </div>

      {/* Audit History Section */}
      <div className="mt-16 max-w-7xl mx-auto w-full print:hidden">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Audit History</h2>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100"
              >
                <Trash2 className="w-4 h-4" /> Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p>No audits conducted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-widest text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.time}</td>
                      <td className="px-6 py-4">{item.module}</td>
                      <td className="px-6 py-4 font-bold">{item.score}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold leading-5 ${
                          item.verdict === 'FAIR' || item.verdict === 'READY' || item.verdict === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          item.verdict === 'HIGH RISK' || item.verdict === 'NOT READY' || item.verdict === 'BIASED' && Number(item.score) > 70 ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.verdict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <p className="text-xs text-center text-slate-400 mt-6 italic">
            Note: Audit history is saved locally and temporarily in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
