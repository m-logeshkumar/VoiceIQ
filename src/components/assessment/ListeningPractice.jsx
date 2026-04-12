import { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { analyzeListening } from '../../services/aiService';
import { getListeningItems } from '../../services/dataService';
import { Mic, Square, RotateCcw, Send, Headphones, Loader2, Play, Pause, Volume2, RefreshCw } from 'lucide-react';

export default function ListeningPractice({ onComplete }) {
  const [item, setItem] = useState(null);
  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState('listen'); // listen, record, result
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const synthRef = useRef(null);
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, clearRecording, formatDuration } = useAudioRecorder();
  const { transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    async function loadItems() {
      const loaded = await getListeningItems();
      setItems(loaded);
      if (loaded.length > 0) {
        setItem(loaded[Math.floor(Math.random() * loaded.length)]);
      }
    }

    loadItems().catch(console.error);
  }, []);

  const playAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onend = () => { setIsPlaying(false); setPlayCount(p => p + 1); };
    utterance.onerror = () => setIsPlaying(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleStartRecording = async () => {
    resetTranscript();
    await startRecording();
    startListening();
  };

  const handleStopRecording = () => {
    stopRecording();
    stopListening();
  };

  const handleSubmit = async () => {
    if (!transcript) return;
    setAnalyzing(true);
    setPhase('result');
    try {
      const res = await analyzeListening(transcript, item.text);
      setResult(res);
      if (onComplete) onComplete(res);
    } catch (err) { console.error(err); }
    finally { setAnalyzing(false); }
  };

  const handleReset = () => {
    clearRecording(); resetTranscript(); setResult(null); setPhase('listen');
    if (items.length > 0) {
      setItem(items[Math.floor(Math.random() * items.length)]);
    }
    setPlayCount(0);
  };

  if (!item) return <div className="loading-spinner"></div>;

  return (
    <div style={{ animation: 'fadeInUp 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2><Headphones size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Listening Practice</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Listen carefully, then speak what you heard</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge badge-${item.difficulty === 'Intermediate' ? 'amber' : 'emerald'}`}>{item.difficulty}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleReset}><RefreshCw size={14} /> New Audio</button>
        </div>
      </div>

      {/* Audio Player */}
      <div className="recorder-container" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 4 }}>{item.title}</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Played {playCount} time{playCount !== 1 ? 's' : ''}</p>
        </div>
        <button className={`recorder-btn ${isPlaying ? 'recording' : 'idle'}`} onClick={playAudio}
          style={{ background: isPlaying ? 'var(--accent-emerald)' : undefined }}>
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 12 }}>
          {isPlaying ? 'Playing audio... Listen carefully' : 'Click to play the audio passage'}
        </p>
        {isPlaying && (
          <div className="waveform-container">
            {[...Array(10)].map((_, i) => <div key={i} className="waveform-bar" style={{ background: 'var(--accent-emerald)' }} />)}
          </div>
        )}
        {phase === 'listen' && playCount > 0 && (
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setPhase('record')}>
            <Mic size={18} /> Ready to Speak
          </button>
        )}
      </div>

      {/* Recording Phase */}
      {phase === 'record' && (
        <div className="recorder-container">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Now speak what you heard:</p>
          {isRecording && (
            <div className="waveform-container">
              {[...Array(10)].map((_, i) => <div key={i} className="waveform-bar" />)}
            </div>
          )}
          <button className={`recorder-btn ${isRecording ? 'recording' : 'idle'}`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}>
            {isRecording ? <Square size={28} /> : <Mic size={28} />}
          </button>
          <div className="recorder-timer">{formatDuration(duration)}</div>

          {audioUrl && (
            <div style={{ marginTop: 16 }}>
              <audio controls src={audioUrl} style={{ width: '100%', height: 40 }} />
            </div>
          )}
          {transcript && (
            <div style={{ marginTop: 16, textAlign: 'left', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Your transcript:</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{transcript}</p>
            </div>
          )}
          <div className="recorder-controls">
            {audioBlob && !analyzing && (
              <>
                <button className="btn btn-secondary" onClick={() => { clearRecording(); resetTranscript(); }}><RotateCcw size={16} /> Re-record</button>
                <button className="btn btn-primary" onClick={handleSubmit}><Send size={16} /> Submit</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Analyzing */}
      {analyzing && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>AI is analyzing your listening skills...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="result-section" style={{ marginTop: 24 }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="overall-score">{result.overallScore}</div>
              <p style={{ color: 'var(--text-secondary)' }}>Listening Score</p>
              <span className={`performance-badge ${result.performanceLevel.toLowerCase()}`}>{result.performanceLevel}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Listening', score: result.listeningScore, color: '#3b82f6' },
                { label: 'Accuracy', score: result.accuracy, color: '#10b981' },
                { label: 'Pronunciation', score: result.pronunciation, color: '#8b5cf6' },
                { label: 'Fluency', score: result.fluency, color: '#06b6d4' },
                { label: 'Memory', score: result.memoryRetention, color: '#f59e0b' },
                { label: 'Clarity', score: result.speechClarity, color: '#ec4899' },
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
