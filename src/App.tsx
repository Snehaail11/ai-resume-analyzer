import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { analyzeResume } from './lib/grok';
import { parseResumeFile } from './lib/fileParser';

interface AnalysisResult {
  overallScore: number;
  scores: {
    skills: number;
    experience: number;
    education: number;
    format: number;
  };
  matchingKeywords: string[];
  missingKeywords: string[];
  gaps: Array<{
    requirement: string;
    candidate: string;
    severity: string;
    action: string;
  }>;
  recommendations: {
    highPriority: string[];
    mediumPriority: string[];
    quickWins: string[];
  };
}

function App() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [jdUploading, setJdUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Handle Resume File Upload
  const onResumeDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setResumeFileName(file.name);
    setResumeUploading(true);
    
    try {
      const text = await parseResumeFile(file);
      setResumeText(text);
    } catch (error: any) {
      alert(error.message);
      setResumeFileName('');
    } finally {
      setResumeUploading(false);
    }
  }, []);

  // Handle Job Description File Upload
  const onJDDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setJdFileName(file.name);
    setJdUploading(true);
    
    try {
      const text = await parseResumeFile(file);
      setJdText(text);
    } catch (error: any) {
      alert(error.message);
      setJdFileName('');
    } finally {
      setJdUploading(false);
    }
  }, []);

  const { getRootProps: getResumeRootProps, getInputProps: getResumeInputProps, isDragActive: isResumeDragActive } = useDropzone({
    onDrop: onResumeDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const { getRootProps: getJDRootProps, getInputProps: getJDInputProps, isDragActive: isJDDragActive } = useDropzone({
    onDrop: onJDDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      alert('Please add both resume and job description (paste text or upload file)');
      return;
    }

    setLoading(true);
    
    try {
      const analysis = await analyzeResume(resumeText, jdText);
      setResult(analysis);
      setShowResults(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please make sure you have a valid Gemini API key in .env file');
    } finally {
      setLoading(false);
    }
  };

  const clearResume = () => {
    setResumeText('');
    setResumeFileName('');
  };

  const clearJD = () => {
    setJdText('');
    setJdFileName('');
  };

  const resetForm = () => {
    setShowResults(false);
    setResult(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match! 🎉';
    if (score >= 75) return 'Good Match 👍';
    if (score >= 60) return 'Decent Match 📝';
    if (score >= 40) return 'Needs Work 🔧';
    return 'Poor Match 💔';
  };

  if (showResults && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AI Resume Analyzer
              </h1>
              <button
                onClick={resetForm}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← New Analysis
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Score Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center justify-center gap-2 text-xl">
                <span>🎯</span> Match Score
              </h2>
            </div>
            <div className="p-8 text-center">
              <div className={`text-7xl font-bold ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <div className="w-full max-w-md mx-auto mt-4 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${getScoreBg(result.overallScore)}`}
                  style={{ width: `${result.overallScore}%` }}
                />
              </div>
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium ${
                  result.overallScore >= 75 ? 'bg-green-100 text-green-700' :
                  result.overallScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <span>⭐</span> {getScoreLabel(result.overallScore)}
                </span>
              </div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(result.scores).map(([key, score]) => (
              <div key={key} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide">{key}</div>
                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreBg(score)}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Keywords */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h3 className="font-semibold text-gray-900">Keywords Found</h3>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {result.matchingKeywords.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.matchingKeywords.map((kw, i) => (
                  <span key={i} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">❌</span>
                <h3 className="font-semibold text-gray-900">Missing Keywords</h3>
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full ml-auto">
                  {result.missingKeywords.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((kw, i) => (
                  <span key={i} className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>✨</span> AI Recommendations
            </h3>
            
            {result.recommendations.highPriority.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-700 font-medium text-sm">HIGH PRIORITY</span>
                </div>
                <ul className="space-y-2">
                  {result.recommendations.highPriority.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.mediumPriority.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-700 font-medium text-sm">MEDIUM PRIORITY</span>
                </div>
                <ul className="space-y-2">
                  {result.recommendations.mediumPriority.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-yellow-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.quickWins.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium text-sm">QUICK WINS</span>
                </div>
                <ul className="space-y-2">
                  {result.recommendations.quickWins.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
              <span className="text-2xl">✨</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            AI Resume Analyzer
          </h1>
          <p className="text-gray-500 mt-2">Upload files or paste text - AI compares and scores your match</p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">🤖 Google Gemini AI</span>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">📄 PDF/DOCX Support</span>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">✨ Free</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Resume Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2 text-lg">
                <span>📄</span> Your Resume
              </h2>
              <p className="text-blue-100 text-sm">Upload PDF, DOCX, or paste text</p>
            </div>
            <div className="p-5">
              {/* Dropzone */}
              <div
                {...getResumeRootProps()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
                  isResumeDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <input {...getResumeInputProps()} />
                <span className="text-3xl">📁</span>
                <p className="text-sm text-gray-600 mt-1">
                  {isResumeDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-gray-400">PDF, DOCX, or TXT</p>
              </div>

              {/* File info */}
              {resumeFileName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="text-sm text-green-800 truncate">{resumeFileName}</span>
                  </div>
                  <button onClick={clearResume} className="text-red-500 hover:text-red-700 text-lg">
                    ✕
                  </button>
                </div>
              )}

              {resumeUploading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-1">Parsing file...</p>
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-2">Or paste text:</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume here..."
                className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>
          </div>

          {/* Job Description Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2 text-lg">
                <span>💼</span> Job Description
              </h2>
              <p className="text-indigo-100 text-sm">Upload PDF, DOCX, or paste text</p>
            </div>
            <div className="p-5">
              {/* Dropzone */}
              <div
                {...getJDRootProps()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
                  isJDDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <input {...getJDInputProps()} />
                <span className="text-3xl">📁</span>
                <p className="text-sm text-gray-600 mt-1">
                  {isJDDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-gray-400">PDF, DOCX, or TXT</p>
              </div>

              {/* File info */}
              {jdFileName && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="text-sm text-green-800 truncate">{jdFileName}</span>
                  </div>
                  <button onClick={clearJD} className="text-red-500 hover:text-red-700 text-lg">
                    ✕
                  </button>
                </div>
              )}

              {jdUploading && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-1">Parsing file...</p>
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-2">Or paste text:</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description here..."
                className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={handleAnalyze}
            disabled={loading || !resumeText || !jdText}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-3 text-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing with AI...
              </>
            ) : (
              <>
                <span>🎯</span>
                Analyze Match Score
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;