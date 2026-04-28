import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Database, BrainCircuit, Loader2, AlertTriangle, ArrowLeft, ShieldCheck, AlertCircle, FileText, Download } from 'lucide-react';
import { Type } from '@google/genai';
import { generateContentWithFallback } from '../lib/gemini';

interface ColumnRisk {
  column: string;
  risk_score: number;
}

interface DatasetAuditResult {
  bias_risk_score: number;
  flagged_columns: string[];
  column_risks: ColumnRisk[];
  suspicious_correlations: string[];
  recommendations: string[];
}

interface DatasetScannerProps {
  onBack: () => void;
  onAuditComplete?: (score: number | string, verdict: string) => void;
}

export default function DatasetScanner({ onBack, onAuditComplete }: DatasetScannerProps) {
  const [inputType, setInputType] = useState<'upload' | 'paste'>('upload');
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [datasetUseCase, setDatasetUseCase] = useState('hiring');
  
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [result, setResult] = useState<DatasetAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setDatasetFile(null);
    setCsvText('');
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDatasetFile(e.target.files[0]);
    }
  };

  const handleExample = () => {
    const exampleCsv = "applicant_id,years_experience,education_level,zip_code,credit_score,loan_approved\n1,5,Bachelors,90210,750,Yes\n2,2,High School,90001,620,No\n3,8,Masters,10021,780,Yes\n4,1,High School,10451,590,No\n5,6,Bachelors,90210,740,Yes";
    const exampleFile = new File([exampleCsv], "loan_data_sample.csv", { type: "text/csv" });
    setDatasetFile(exampleFile);
    setCsvText(exampleCsv);
    setDatasetUseCase("loan");
    setInputType("upload");
  };

  const getRiskColor = (score: number) => {
    if (score > 70) return { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', stroke: '#ef4444' };
    if (score >= 40) return { bg: 'bg-yellow-50', text: 'text-yellow-500', border: 'border-yellow-100', stroke: '#eab308' };
    return { bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-100', stroke: '#22c55e' };
  };

  const handleScan = async () => {
    let dataToScan = '';

    if (inputType === 'upload' && datasetFile) {
      const text = await datasetFile.text();
      // Keep a good sample avoiding token limit but retaining enough rows to spot correlations
      dataToScan = text.split('\n').slice(0, 150).join('\n');
    } else if (inputType === 'paste' && csvText.trim()) {
      dataToScan = csvText.trim();
    } else {
      return;
    }
    
    setStatus('scanning');
    setError(null);
    setResult(null);

    try {
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          bias_risk_score: {
            type: Type.NUMBER,
            description: "A bias risk score from 0-100 (0 = fair, 100 = highly biased)."
          },
          flagged_columns: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Columns that likely contain protected attributes."
          },
          column_risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                column: { type: Type.STRING, description: "Name of the column" },
                risk_score: { type: Type.NUMBER, description: "Risk score from 0-100" }
              },
              required: ["column", "risk_score"]
            },
            description: "Risk scores for each flagged or potentially biasing column."
          },
          suspicious_correlations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Which columns show suspicious correlation with outcomes."
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 specific recommendations to fix the bias."
          }
        },
        required: ["bias_risk_score", "flagged_columns", "column_risks", "suspicious_correlations", "recommendations"]
      };

      const prompt = `You are an AI fairness auditor. Analyze this dataset sample to identify any columns that could introduce unfair bias (gender, race, age, location, religion) when training an AI model.

The intended use case for this dataset is: ${datasetUseCase.toUpperCase()}-related models.

Dataset Sample:
${dataToScan}

Identify flagged columns that are protected attributes or proxies, generate a risk score (0-100) for each of these columns showing how likely they are to introduce bias, spot potential suspicious correlations showing proxy bias, and give actionable recommendations.`;

      const response = await generateContentWithFallback({
        // model: 'gemini-2.5-flash', (handled by fallback)
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1
        }
      });

      if (!response.text) {
        throw new Error("No response generated from the model.");
      }

      const parsedData = JSON.parse(response.text.trim()) as DatasetAuditResult;
      setResult(parsedData);
      setStatus('done');
      
      let verdict = 'FAIR';
      if (parsedData.bias_risk_score > 70) verdict = 'HIGH RISK';
      else if (parsedData.bias_risk_score >= 40) verdict = 'BIASED';
      
      onAuditComplete?.(parsedData.bias_risk_score, verdict);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred during scanning. Make sure the input is valid CSV data.");
      setStatus('idle');
    }
  };

  const isScanDisabled = status !== 'idle' && status !== 'done' || (inputType === 'upload' ? !datasetFile : !csvText.trim());

  return (
    <div className="flex flex-col h-full print:bg-white print:h-auto">
      <header className="mb-8 max-w-7xl mx-auto w-full flex items-center gap-4 print:hidden">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
            <Database className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dataset Bias Scanner</h1>
            <p className="text-sm font-medium text-slate-500">Detect unfair patterns in training data</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0 print:block">
        
        {/* Left Panel: Inputs */}
        <div className="space-y-6 flex flex-col h-full print:hidden">
          
          <div className="flex justify-end -mb-2 relative z-10">
            <button 
              onClick={handleExample}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-1"
            >
              Try an Example →
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6 flex-shrink-0">
            {/* Use Case Dropdown */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                01 / Dataset Use Case
              </h2>
              <select 
                value={datasetUseCase}
                onChange={(e) => setDatasetUseCase(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium transition-shadow appearance-none"
              >
                <option value="hiring">Hiring / Recruitment</option>
                <option value="loans">Loans / Financial Credit</option>
                <option value="medical">Medical / Healthcare</option>
                <option value="other">Other / General</option>
              </select>
            </div>

            {/* Input Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setInputType('upload')}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${inputType === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Upload CSV
              </button>
              <button
                onClick={() => setInputType('paste')}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${inputType === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Paste Data
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2">
              {inputType === 'upload' ? <Database className="w-4 h-4" /> : <FileText className="w-4 h-4" />} 
              02 / {inputType === 'upload' ? 'Upload Dataset' : 'Paste CSV Data'}
            </h2>
            
            {inputType === 'upload' ? (
              <div 
                className="mt-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-slate-300 hover:bg-slate-50/50 transition-colors cursor-pointer group flex-1"
                onClick={() => document.getElementById('dataset-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="dataset-upload" 
                  className="hidden" 
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                {datasetFile ? (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{datasetFile.name}</p>
                    <p className="text-xs text-slate-500">{(datasetFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">Click to upload CSV dataset</p>
                    <p className="text-sm text-slate-400">We'll scan the top rows for bias markers</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea 
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste your raw CSV data here (include headers)..."
                className="w-full flex-1 bg-slate-50 border-none rounded-xl p-5 text-slate-800 text-sm font-mono placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none leading-relaxed"
              />
            )}
          </div>

          <button 
            onClick={handleScan} 
            disabled={isScanDisabled}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex-shrink-0"
          >
            {status === 'scanning' ? (
              <><Loader2 className="animate-spin w-5 h-5" /> Scanning...</>
            ) : (
              <><BrainCircuit className="w-5 h-5" /> Scan for Bias</>
            )}
          </button>

          {error && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                {error}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Right Panel: Output */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden h-[800px] lg:h-auto print:border-none print:shadow-none print:p-0 print:h-auto print:overflow-visible">
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10 p-8 text-center text-slate-400 border border-slate-100/50 m-4 rounded-2xl">
              <Database className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-500">Provide a CSV dataset to begin.</p>
              <p className="text-sm mt-2">The AI will flag columns and correlations that might introduce unfair bias into your models.</p>
            </div>
          )}
          
          <AnimatePresence>
            {status === 'scanning' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20"
              >
                <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <p className="font-semibold text-slate-700 tracking-wide uppercase text-sm mb-2">
                  Scanning Dataset
                </p>
                <p className="text-xs text-slate-400 font-medium">Looking for protected attributes & proxies...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'done' && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex-1 flex flex-col overflow-y-auto print:overflow-visible pr-4 -mr-4 custom-scrollbar print:pr-0 print:mr-0"
            >
              
              {/* Score Header */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-100 flex-shrink-0">
                <motion.div 
                  className="w-28 h-28 rounded-full border-[8px] border-slate-50 flex flex-col items-center justify-center relative flex-shrink-0 bg-white"
                >
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="50%" cy="50%" r="48" fill="none" stroke="#f8fafc" strokeWidth="8" />
                    <circle 
                      cx="50%" cy="50%" r="48" fill="none" stroke={getRiskColor(result.bias_risk_score).stroke} 
                      strokeWidth="8" strokeDasharray="301" 
                      strokeDashoffset={301 - (301 * result.bias_risk_score) / 100} 
                      strokeLinecap="round" 
                      className="transition-all duration-1000 ease-out delay-300" 
                    />
                  </svg>
                  <span className={`text-4xl font-light ${getRiskColor(result.bias_risk_score).text}`}>
                    {result.bias_risk_score}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">Bias Risk</span>
                </motion.div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Dataset Bias Report</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    {result.bias_risk_score > 70 
                      ? "High risk of bias detected. Significant interventions recommended before using this data."
                      : result.bias_risk_score >= 40
                      ? "Moderate risk of bias. Review correlations and flagged attributes."
                      : "Low bias risk. The dataset appears relatively fair based on the sample provided."}
                  </p>
                </div>
              </div>

              {/* Flagged Columns */}
              <div className="mb-8">
                <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Flagged Columns (Protected Attributes)
                </h4>
                {result.flagged_columns.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.flagged_columns.map((col, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm font-semibold">
                        {col}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 text-slate-500 rounded-xl p-4 text-sm flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    No obviously protected attribute columns detected.
                  </div>
                )}
                
                {result.column_risks && result.column_risks.length > 0 && (
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Column Bias Risk Overview</h5>
                    {result.column_risks.map((riskItem, idx) => {
                      const riskColor = riskItem.risk_score > 70 ? 'bg-red-500' : riskItem.risk_score >= 40 ? 'bg-yellow-500' : 'bg-green-500';
                      return (
                        <div key={idx} className="flex items-center gap-4 text-sm font-medium">
                          <div className="w-32 truncate text-slate-700">{riskItem.column}</div>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${riskColor} rounded-full transition-all duration-1000`} 
                              style={{ width: `${riskItem.risk_score}%` }}
                            ></div>
                          </div>
                          <div className="w-12 text-right text-slate-500">{riskItem.risk_score}%</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suspicious Correlations */}
              <div className="mb-8">
                <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Suspicious Correlations (Potential Proxies)
                </h4>
                {result.suspicious_correlations.length > 0 ? (
                  <ul className="space-y-3">
                    {result.suspicious_correlations.map((corr, idx) => (
                      <li key={idx} className="bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-xl p-4 text-sm font-medium">
                        {corr}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-slate-50 text-slate-500 rounded-xl p-4 text-sm flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5 text-green-500" />
                    No obvious suspicious proxy correlations detected in the sample.
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="mb-8">
                <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" />
                    Recommended Actions
                </h4>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="w-6 h-6 flex-shrink-0 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700 font-medium pt-0.5">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4 flex-shrink-0 pb-4 mt-auto pt-6 border-t border-slate-100 print:hidden">
                <button 
                  onClick={handleReset}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                >
                  Scan Another Dataset
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" /> Download Report Card
                </button>
              </div>

              <p className="hidden print:block text-xs text-center text-slate-500 mt-8 italic border-t border-slate-200 pt-4 pb-4">
                This audit was generated to help organizations identify and fix bias before their AI systems impact real people.
              </p>

            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}

