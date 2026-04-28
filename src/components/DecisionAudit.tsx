import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BrainCircuit, Loader2, ArrowLeft, ShieldCheck, AlertTriangle, AlertCircle, Download } from 'lucide-react';
import { Type } from '@google/genai';
import { ChecklistResult } from './Checklist';
import { generateContentWithFallback } from '../lib/gemini';

export interface WhatIfScenario {
  attribute_changed: string;
  scenario_description: string;
  new_outcome: string;
  verdict: 'FAIR' | 'BIASED' | 'HIGH RISK';
  decision_changed: boolean;
}

export interface AuditResult {
  model_risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  model_risk_reason: string;
  decision_fairness: 'FAIR' | 'POTENTIALLY BIASED' | 'BIASED';
  explanation: string;
  recommendations: string[];
  flaggedAttributes?: string[];
  what_if_scenarios?: WhatIfScenario[];
}

interface DecisionAuditProps {
  onBack: () => void;
  checklistResult?: ChecklistResult | null;
  onAuditComplete?: (score: string, verdict: string) => void;
}

export default function DecisionAudit({ onBack, checklistResult, onAuditComplete }: DecisionAuditProps) {
  const [decisionType, setDecisionType] = useState('loan');
  const [modelTrainedOn, setModelTrainedOn] = useState('Historical company data');
  const [trainingDataIncludes, setTrainingDataIncludes] = useState<string[]>([]);
  const [attributesDirectInputs, setAttributesDirectInputs] = useState(false);
  const [inputData, setInputData] = useState('');
  const [decisionContext, setDecisionContext] = useState('');
  const [status, setStatus] = useState<'idle' | 'auditing' | 'done'>('idle');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTrainingDataOption = (option: string) => {
    if (option === 'None of the above') {
      setTrainingDataIncludes(['None of the above']);
      return;
    }
    setTrainingDataIncludes(prev => {
      const withoutNone = prev.filter(p => p !== 'None of the above');
      if (withoutNone.includes(option)) {
        return withoutNone.filter(p => p !== option);
      } else {
        return [...withoutNone, option];
      }
    });
  };

  const handleReset = () => {
    setDecisionContext('');
    setInputData('');
    setModelTrainedOn('Historical company data');
    setTrainingDataIncludes([]);
    setAttributesDirectInputs(false);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const handleExample = () => {
    setDecisionType('loan');
    setModelTrainedOn('Historical company data');
    setTrainingDataIncludes(['Zip Code or Location', 'Race or Ethnicity']);
    setAttributesDirectInputs(true);
    setInputData(`Applicant: Marcus Johnson\nIncome: $65,000\nCredit Score: 710\nZip Code: 11212\nEmployment: 4 years\nDebt-to-Income: 32%`);
    setDecisionContext(`The AI model rejected the loan application. The primary reason cited was "Insufficient credit history and zip code risk factors", despite the applicant being within standard approval ranges for income and credit score.`);
  };

  const handleAudit = async () => {
    if (!decisionContext || !inputData) return;
    
    setStatus('auditing');
    setError(null);
    setResult(null);

    try {
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          model_risk_level: {
            type: Type.STRING,
            enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
            description: "The risk level, HIGH / MEDIUM / LOW / UNKNOWN."
          },
          model_risk_reason: {
            type: Type.STRING,
            description: "Explanation for the model risk level (e.g. Protected attributes used as direct inputs)."
          },
          decision_fairness: {
            type: Type.STRING,
            enum: ['FAIR', 'POTENTIALLY BIASED', 'BIASED'],
            description: "The fairness verdict for the decision."
          },
          explanation: {
            type: Type.STRING,
            description: "One paragraph plain English explanation for non-technical users. No jargon. Write like explaining to a 16 year old."
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of recommendations for the user."
          },
          flaggedAttributes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of protected attributes found to be direct inputs or otherwise flagged in the input data."
          },
          what_if_scenarios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                attribute_changed: { type: Type.STRING },
                scenario_description: { type: Type.STRING },
                new_outcome: { type: Type.STRING },
                verdict: { type: Type.STRING, enum: ['FAIR', 'BIASED', 'HIGH RISK'] },
                decision_changed: { type: Type.BOOLEAN }
              },
              required: ["attribute_changed", "scenario_description", "new_outcome", "verdict", "decision_changed"]
            },
            description: "Exactly 3 automatically generated what-if scenarios: 1) Same application but Gender changed, 2) Zip Code removed, 3) Age changed to 28. If those don't exist in the data, pick 3 other likely attributes (like Race, Income, etc) and show how changing them might alter the outcome. Provide a theoretical new outcome based on known biases."
          }
        },
        required: ["model_risk_level", "model_risk_reason", "decision_fairness", "explanation", "recommendations", "flaggedAttributes", "what_if_scenarios"]
      };

      const prompt = `You are an AI fairness auditor. Review this AI system's decision context and the specific input data used. Determine if protected attributes (like race, gender, age, religion, zip code proxy) likely influenced the decision unfairly.

The domain for this decision is: ${decisionType.toUpperCase()}

Model Background:
- Trained on: ${modelTrainedOn}
- Training data included protected attributes: ${trainingDataIncludes.length > 0 ? trainingDataIncludes.join(', ') : 'Not specified'}
- Protected attributes used as direct inputs: ${attributesDirectInputs ? 'Yes' : 'No'}

Input Data Provided to the AI:
${inputData}

AI System Decision & Reason:
${decisionContext}

Audit this decision and provide a plain-English explanation that a 16-year-old can easily understand. Avoid technical jargon.

Logic Requirements:
- If protected attributes were used as direct model inputs -> automatically flag model_risk_level as HIGH before even analyzing the decision.
- If training data source is Unknown -> add warning in model_risk_reason: "Unknown training data is itself a bias risk".
- In the what_if_scenarios, automatically simulate: 1) Gender changed, 2) Zip Code removed, 3) Age changed to 28. If these don't exist in the input, pick 3 relevant attributes to simulate changing. Explain how changing these attributes would theoretically change the outcome based on typical algorithmic biases, and whether the decision would change.`;

      const response = await generateContentWithFallback({
        // model: 'gemini-2.5-flash',
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

      const parsedData = JSON.parse(response.text.trim()) as AuditResult;
      setResult(parsedData);
      setStatus('done');
      onAuditComplete?.(parsedData.model_risk_level, parsedData.model_risk_level === 'HIGH' ? 'HIGH RISK' : parsedData.decision_fairness);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred during the audit.");
      setStatus('idle');
    }
  };

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
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">AI Decision Audit</h1>
            <p className="text-sm font-medium text-slate-500">Check if a specific AI decision was biased</p>
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
            {/* Domain Dropdown */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                01 / Decision Type
              </h2>
              <select 
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium transition-shadow appearance-none"
              >
                <option value="loan">Loan / Financial</option>
                <option value="job">Job / Recruitment</option>
                <option value="medical">Medical / Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                02 / Model Background <span className="opacity-70 lowercase font-normal">(optional)</span>
              </h2>
              
              <div className="space-y-4">
                {/* 1. Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    What was the model trained on?
                  </label>
                  <select
                    value={modelTrainedOn}
                    onChange={(e) => setModelTrainedOn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-slate-300 outline-none font-medium appearance-none"
                  >
                    <option value="Historical company data">Historical company data</option>
                    <option value="Public dataset">Public dataset</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* 2. Checkbox list */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Did training data include any of these?
                  </label>
                  <div className="space-y-2">
                    {['Gender', 'Age', 'Race or Ethnicity', 'Zip Code or Location', 'Religion', 'None of the above'].map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trainingDataIncludes.includes(option)}
                          onChange={() => toggleTrainingDataOption(option)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700 font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Checkbox */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer mt-4 border-t border-slate-100 pt-4">
                    <input
                      type="checkbox"
                      checked={attributesDirectInputs}
                      onChange={(e) => setAttributesDirectInputs(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 mt-1"
                    />
                    <span className="text-sm text-slate-700 font-semibold leading-tight">
                      Were these attributes used as direct inputs to the model? (not just present in data)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2 flex-shrink-0">
              <Activity className="w-4 h-4" /> 03 / Input Data
            </h2>
            <textarea 
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Paste the raw inputs given to the AI (e.g., Age: 34, Gender: Female, Zip: 380001, Income: 45000, Credit Score: 710)"
              className="w-full flex-1 bg-slate-50 border-none rounded-xl p-5 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none font-mono leading-relaxed"
            />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-4 mb-4 flex items-center gap-2 flex-shrink-0">
              <BrainCircuit className="w-4 h-4" /> 04 / AI Decision & Reason
            </h2>
            <textarea 
              value={decisionContext}
              onChange={(e) => setDecisionContext(e.target.value)}
              placeholder="Paste the decision the AI made (e.g., Decision: Rejected. Reason: Applicant credit risk profile is slightly elevated based on demographic location.)"
              className="w-full flex-1 bg-slate-50 border-none rounded-xl p-5 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-slate-200 outline-none resize-none font-mono leading-relaxed"
            />
          </div>

          <button 
            onClick={handleAudit} 
            disabled={status !== 'idle' && status !== 'done' || !decisionContext || !inputData}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex-shrink-0"
          >
            {status === 'auditing' ? (
              <><Loader2 className="animate-spin w-5 h-5" /> Auditing...</>
            ) : (
              <><BrainCircuit className="w-5 h-5" /> Run Audit</>
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
              <Activity className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-500">Provide the decision and inputs to audit.</p>
              <p className="text-sm mt-2">The AI will analyze if protected attributes influenced the outcome.</p>
            </div>
          )}
          
          <AnimatePresence>
            {status === 'auditing' && (
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
                  Auditing Decision
                </p>
                <p className="text-xs text-slate-400 font-medium">Analyzing inputs for hidden bias...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'done' && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex-1 flex flex-col overflow-y-auto print:overflow-visible pr-4 -mr-4 custom-scrollbar print:pr-0 print:mr-0"
            >
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight mb-6">Audit Report</h3>
              
              <div className={`p-6 rounded-2xl border mb-6 ${
                result.decision_fairness === 'BIASED'
                  ? 'bg-red-50 text-red-900 border-red-200' 
                  : result.decision_fairness === 'POTENTIALLY BIASED'
                  ? 'bg-yellow-50 text-yellow-900 border-yellow-200'
                  : 'bg-green-50 text-green-900 border-green-200'
              }`}>
                <div className="flex items-center gap-4">
                  {result.decision_fairness === 'BIASED' ? (
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  ) : result.decision_fairness === 'POTENTIALLY BIASED' ? (
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  ) : (
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  )}
                  <div>
                    <h4 className="text-xl font-bold">
                      {result.decision_fairness === 'BIASED' 
                        ? 'Biased Decision' 
                        : result.decision_fairness === 'POTENTIALLY BIASED' 
                        ? 'Potentially Biased' 
                        : 'Fair Decision'}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Model Risk Assessment */}
              <div className="mb-6 print:block">
                <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  Model Risk Assessment
                </h4>
                <div className={`rounded-xl p-5 border shadow-sm ${
                  result.model_risk_level === 'HIGH' ? 'bg-red-50 text-red-900 border-red-200' :
                  result.model_risk_level === 'MEDIUM' ? 'bg-orange-50 text-orange-900 border-orange-200' :
                  result.model_risk_level === 'UNKNOWN' ? 'bg-slate-50 text-slate-900 border-slate-200' :
                  'bg-green-50 text-green-900 border-green-200'
                }`}>
                  <div className="space-y-3 text-sm">
                    <p><span className="font-semibold opacity-80 uppercase text-xs">Training data source:</span><br/> {modelTrainedOn}</p>
                    <p><span className="font-semibold opacity-80 uppercase text-xs">Protected attributes in training data:</span><br/> {
                      (() => {
                        const selected = trainingDataIncludes.filter(a => a !== 'None of the above');
                        if (selected.length > 0) return selected.join(', ');
                        
                        if (result.flaggedAttributes && result.flaggedAttributes.length > 0) {
                          return result.flaggedAttributes.join(', ');
                        }

                        if (result.model_risk_level === 'HIGH' || attributesDirectInputs) {
                           return 'Unspecified (Flagged as Direct Inputs)';
                        }

                        return 'None';
                      })()
                    }</p>
                    <div>
                      <span className="font-semibold opacity-80 uppercase text-xs">Model risk level:</span><br/>
                      <span className="font-black text-base">{result.model_risk_level} RISK</span>
                    </div>
                    <p><span className="font-semibold opacity-80 uppercase text-xs">Risk reason:</span><br/> {result.model_risk_reason}</p>
                  </div>
                </div>
              </div>

              {/* Explanation in Plain English */}
              <div className="mb-6">
                <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  Plain English Explanation
                </h4>
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 shadow-sm">
                  <p className="text-slate-800 text-[15px] leading-relaxed font-medium">
                    {result.explanation}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="mb-6">
                  <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 font-medium flex items-start gap-2">
                        <span className="text-slate-400 font-bold">{idx + 1}.</span> {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What-If Analysis */}
              {result.what_if_scenarios && result.what_if_scenarios.length > 0 && (
                <div className="mb-6">
                  <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    What if we changed one thing?
                  </h4>
                  <div className="space-y-3">
                    {result.what_if_scenarios.map((scenario, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-bold text-slate-900">{scenario.scenario_description}</h5>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                            scenario.verdict === 'FAIR' ? 'bg-green-100 text-green-800' :
                            scenario.verdict === 'HIGH RISK' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {scenario.verdict}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-600 mb-3">
                          <strong>New Outcome: </strong> {scenario.new_outcome}
                        </div>
                        {scenario.decision_changed && (
                          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold border border-red-100 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Changing {scenario.attribute_changed} changed the outcome. This is evidence of bias.</p>
                          </div>
                        )}
                        {!scenario.decision_changed && (
                          <div className="bg-slate-50 text-slate-600 px-4 py-3 rounded-lg text-sm font-semibold border border-slate-100 flex items-start gap-2">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                            <p>Changing {scenario.attribute_changed} did not change the outcome.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pre-Deployment Status */}
              {checklistResult && (
                <div className="mb-6 print:block">
                  <h4 className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    Pre-Deployment Status
                  </h4>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 shadow-sm text-sm space-y-4 text-slate-800">
                    <p>
                      <strong className="block text-xs uppercase text-slate-500 mb-1">Deployment Readiness:</strong>
                      <span className={`font-bold ${
                        checklistResult.readiness === 'NOT READY' ? 'text-red-600' :
                        checklistResult.readiness === 'NEEDS REVIEW' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{checklistResult.readiness}</span>
                    </p>

                    <div>
                      <strong className="block text-xs uppercase text-slate-500 mb-1">Flags raised:</strong>
                      {checklistResult.risk_flags.length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-2 font-medium">
                          {checklistResult.risk_flags.map((flag, i) => (
                            <li key={i}>{flag.flag} <span className="opacity-70 text-xs ml-1">({flag.question})</span></li>
                          ))}
                        </ol>
                      ) : (
                        <p className="font-medium">None</p>
                      )}
                    </div>

                    <div>
                      <strong className="block text-xs uppercase text-slate-500 mb-1">Required actions before going live:</strong>
                      {checklistResult.fix_steps.length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-1 font-medium">
                          {checklistResult.fix_steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="font-medium">None</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4 flex-shrink-0 pb-4 mt-auto pt-6 border-t border-slate-100 print:hidden">
                <button 
                  onClick={handleReset}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                >
                  Audit Another Decision
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
