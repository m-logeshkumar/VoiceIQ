import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { analyzeReading } from '../../services/aiService';
import { getParagraphs } from '../../services/dataService';
import { Mic, Square, Play, RotateCcw, Send, BookOpen, Loader2, ChevronRight, RefreshCw } from 'lucide-react';

export default function ReadingParagraph({ onComplete }) {
  const [paragraph, setParagraph] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, clearRecording, formatDuration } = useAudioRecorder();
  const { transcript, isListening, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    async function loadParagraphs() {
      const loaded = await getParagraphs();
      setParagraphs(loaded);
      if (loaded.length > 0) {
        setParagraph(loaded[Math.floor(Math.random() * loaded.length)]);
      }
    }

    loadParagraphs().catch(console.error);
  }, []);

  const handleStartRecording = async () => {
    resetTranscript();
    await startRecording();
    startListening();
  };

  const handleStopRecording = () => {
    stopRecording();
    stopListening();
  };

  const handleReRecord = () => {
    clearRecording();
    resetTranscript();
    setResult(null);
    setSubmitted(false);
  };

  const handleNewParagraph = () => {
    if (paragraphs.length === 0) return;
    setParagraph(paragraphs[Math.floor(Math.random() * paragraphs.length)]);
    handleReRecord();
  };

  const handleSubmit = async () => {
    if (!audioBlob || !transcript) return;
    setAnalyzing(true);
    setSubmitted(true);
    try {
      const res = await analyzeReading(transcript, paragraph.text);
      setResult(res);
      if (onComplete) onComplete(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const renderWordHighlights = () => {
    if (!result || !paragraph) return paragraph?.text;
    const words = paragraph.text.split(/(\s+)/);
    return words.map((word, i) => {
      if (/^\s+$/.test(word)) return word;
      const clean = word.toLowerCase().replace(/[^\w]/g, '');
      const isMispronounced = result.mispronounced?.some(m => m.expected === clean);
      const isMissed = result.missedWords?.includes(clean);
      return (
        <span key={i} className={`word ${isMispronounced ? 'incorrect' : isMissed ? 'missed' : submitted ? 'correct' : ''}`}>
          {word}
        </span>
      );
    });
  };

  if (!paragraph) return <div className="loading-spinner"></div>;

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2><BookOpen size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Reading Paragraph</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Read the paragraph below aloud clearly</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge badge-${paragraph.difficulty === 'Advanced' ? 'rose' : paragraph.difficulty === 'Intermediate' ? 'amber' : 'emerald'}`}>{paragraph.difficulty}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleNewParagraph}><RefreshCw size={14} /> New Paragraph</button>
        </div>
      </div>

      {/* Paragraph Display */}
      <div className="reading-text">{renderWordHighlights()}</div>

      {/* Recorder */}
      <div className="recorder-container" style={{ marginTop: 24 }}>
        {isRecording && (
          <div className="waveform-container">
            {[...Array(10)].map((_, i) => <div key={i} className="waveform-bar" />)}
          </div>
        )}
        <button className={`recorder-btn ${isRecording ? 'recording' : 'idle'}`}
          onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={analyzing}>
          {isRecording ? <Square size={28} /> : <Mic size={28} />}
        </button>
        <div className="recorder-timer">{formatDuration(duration)}</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
          {isRecording ? 'Recording... Click to stop' : audioBlob ? 'Recording complete' : 'Click to start recording'}
        </p>

        {audioUrl && (
          <div style={{ marginTop: 16 }}>
            <div className="audio-player">
              <audio controls src={audioUrl} style={{ width: '100%', height: 40 }} />
            </div>
          </div>
        )}

        {transcript && (
          <div style={{ marginTop: 16, textAlign: 'left', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', maxHeight: 120, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Your speech (transcript):</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{transcript}</p>
          </div>
        )}

        <div className="recorder-controls" style={{ marginTop: 20 }}>
          {audioBlob && !analyzing && !result && (
            <>
              <button className="btn btn-secondary" onClick={handleReRecord}><RotateCcw size={16} /> Re-record</button>
              <button className="btn btn-primary" onClick={handleSubmit}><Send size={16} /> Submit for Analysis</button>
            </>
          )}
        </div>

        {analyzing && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>AI is analyzing your speech...</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="result-section" style={{ marginTop: 32 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="overall-score">{result.overallScore}</div>
              <p style={{ color: 'var(--text-secondary)' }}>Reading Score</p>
              <span className={`performance-badge ${result.performanceLevel.toLowerCase()}`}>{result.performanceLevel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Pronunciation', score: result.pronunciation, color: '#3b82f6' },
                { label: 'Fluency', score: result.fluency, color: '#10b981' },
                { label: 'Grammar Clarity', score: result.grammarClarity, color: '#8b5cf6' },
                { label: 'Speech Speed', score: result.speechSpeed, color: '#06b6d4' },
                { label: 'Confidence', score: result.confidence, color: '#f59e0b' },
                { label: 'Accent Clarity', score: result.accentClarity, color: '#ec4899' },
                { label: 'Word Stress', score: result.wordStress, color: '#f43f5e' },
                { label: 'Pauses', score: result.pausesHesitation, color: '#64748b' },
              ].map((s, i) => (
                <div key={i} className="skill-bar">
                  <span className="skill-bar-label">{s.label}</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${s.score}%`, background: s.color }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: s.color, minWidth: 30 }}>{s.score}</span>
                </div>
              ))}
            </div>
            {result.tips.length > 0 && (
              <div style={{ marginTop: 24, padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginBottom: 12, color: 'var(--accent-amber)' }}>💡 Improvement Tips</h4>
                {result.tips.map((t, i) => <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>• {t}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
