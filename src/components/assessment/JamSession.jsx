import { useState, useEffect } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { analyzeJAM } from '../../services/aiService';
import { getTopics } from '../../services/dataService';
import { Mic, Square, RotateCcw, Send, MessageSquare, Loader2, RefreshCw, Lightbulb } from 'lucide-react';

export default function JamSession({ onComplete }) {
  const [topic, setTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, clearRecording, formatDuration } = useAudioRecorder();
  const { transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    async function loadTopics() {
      const loaded = await getTopics();
      setTopics(loaded);
      if (loaded.length > 0) {
        setTopic(loaded[Math.floor(Math.random() * loaded.length)]);
      }
    }

    loadTopics().catch(console.error);
  }, []);

  const pickTopic = () => {
    if (topics.length === 0) return;
    setTopic(topics[Math.floor(Math.random() * topics.length)]);
  };

  const handleStartRecording = async () => {
    resetTranscript();
    await startRecording();
    startListening();
  };

  const handleStopRecording = () => { stopRecording(); stopListening(); };

  const handleReset = () => { clearRecording(); resetTranscript(); setResult(null); };

  const handleSubmit = async () => {
    if (!transcript) return;
    setAnalyzing(true);
    try {
      const res = await analyzeJAM(transcript, topic.title);
      setResult(res);
      if (onComplete) onComplete(res);
    } catch (err) { console.error(err); }
    finally { setAnalyzing(false); }
  };

  if (!topic) return <div className="loading-spinner"></div>;

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2><MessageSquare size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Just A Minute (JAM)</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Speak freely on the given topic</p>
        </div>
      </div>

      {/* Topic Card */}
      <div className="topic-card">
        <h3>Your Topic</h3>
        <div className="topic-name">{topic.title}</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.95rem' }}>{topic.description}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => { pickTopic(); handleReset(); }} style={{ marginTop: 16 }}>
          <RefreshCw size={14} /> Get New Topic
        </button>
      </div>

      {/* Tips */}
      <div style={{ padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Lightbulb size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Tips:</strong> Speak naturally, use varied vocabulary, structure your thoughts (intro → body → conclusion), and maintain a steady pace. There's no time limit!
        </div>
      </div>

      {/* Recorder */}
      <div className="recorder-container">
        {isRecording && (
          <div className="waveform-container">
            {[...Array(10)].map((_, i) => <div key={i} className="waveform-bar" style={{ background: 'var(--accent-purple)' }} />)}
          </div>
        )}
        <button className={`recorder-btn ${isRecording ? 'recording' : 'idle'}`}
          onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={analyzing}
          style={{ background: isRecording ? undefined : 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
          {isRecording ? <Square size={28} /> : <Mic size={28} />}
        </button>
        <div className="recorder-timer">{formatDuration(duration)}</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
          {isRecording ? 'Speaking... Click to stop' : audioBlob ? 'Recording complete' : 'Click to start speaking'}
        </p>

        {audioUrl && (
          <div style={{ marginTop: 16 }}>
            <audio controls src={audioUrl} style={{ width: '100%', height: 40 }} />
          </div>
        )}
        {transcript && (
          <div style={{ marginTop: 16, textAlign: 'left', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', maxHeight: 150, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Your speech ({transcript.split(/\s+/).length} words):</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{transcript}</p>
          </div>
        )}
        <div className="recorder-controls">
          {audioBlob && !analyzing && !result && (
            <>
              <button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={16} /> Re-record</button>
              <button className="btn btn-primary" onClick={handleSubmit}><Send size={16} /> Submit</button>
            </>
          )}
        </div>
        {analyzing && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-purple)' }} />
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>AI is analyzing your speaking...</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="result-section" style={{ marginTop: 32 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="overall-score">{result.overallScore}</div>
              <p style={{ color: 'var(--text-secondary)' }}>Speaking Score</p>
              <span className={`performance-badge ${result.performanceLevel.toLowerCase()}`}>{result.performanceLevel}</span>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                <span className="badge badge-blue">{result.wordCount} words</span>
                <span className="badge badge-purple">{result.vocabLevel} vocabulary</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Fluency', score: result.fluency, color: '#3b82f6' },
                { label: 'Vocabulary', score: result.vocabulary, color: '#10b981' },
                { label: 'Grammar', score: result.grammar, color: '#8b5cf6' },
                { label: 'Confidence', score: result.confidence, color: '#f59e0b' },
                { label: 'Topic Relevance', score: result.topicRelevance, color: '#06b6d4' },
                { label: 'Speaking Flow', score: result.speakingFlow, color: '#ec4899' },
                { label: 'Idea Clarity', score: result.ideaClarity, color: '#f43f5e' },
              ].map((s, i) => (
                <div key={i} className="skill-bar">
                  <span className="skill-bar-label">{s.label}</span>
                  <div className="skill-bar-track"><div className="skill-bar-fill" style={{ width: `${s.score}%`, background: s.color }} /></div>
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
