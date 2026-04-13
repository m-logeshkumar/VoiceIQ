import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReadingParagraph from '../components/assessment/ReadingParagraph';
import ListeningPractice from '../components/assessment/ListeningPractice';
import JamSession from '../components/assessment/JamSession';
import { generateFinalReport } from '../services/aiService';
import { saveScore } from '../services/dataService';
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Headphones, MessageSquare, Trophy } from 'lucide-react';

const STEPS = [
  { id: 'reading', label: 'Reading', icon: <BookOpen size={18} /> },
  { id: 'listening', label: 'Listening', icon: <Headphones size={18} /> },
  { id: 'jam', label: 'JAM', icon: <MessageSquare size={18} /> },
];

export default function Assessment() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(type === 'listening' ? 1 : type === 'jam' ? 2 : 0);
  const [results, setResults] = useState({ reading: null, listening: null, jam: null });
  const [savedSteps, setSavedSteps] = useState({ reading: false, listening: false, jam: false });
  const [showFinal, setShowFinal] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const buildSingleStepReport = (stepId, result) => {
    const reading = stepId === 'reading' ? (result?.overallScore || 0) : 0;
    const listening = stepId === 'listening' ? (result?.overallScore || 0) : 0;
    const speaking = stepId === 'jam' ? (result?.overallScore || 0) : 0;
    const overall = result?.overallScore || 0;

    return {
      overall,
      performanceLevel: result?.performanceLevel || 'Beginner',
      scores: { reading, listening, speaking },
      pronunciation: result?.pronunciation || 0,
      fluency: result?.fluency || 0,
      listening: result?.listeningScore || result?.accuracy || listening,
      confidence: result?.confidence || 0,
      vocabulary: result?.vocabulary || 0,
      grammar: result?.grammarClarity || result?.grammar || 0,
      strengths: [stepId.charAt(0).toUpperCase() + stepId.slice(1)],
      weaknesses: [],
      tips: result?.tips || [],
      date: new Date().toISOString(),
    };
  };

  const handleComplete = async (stepId, result) => {
    setResults(prev => ({ ...prev, [stepId]: result }));

    // Save each completed test immediately so dashboard/leaderboard updates even
    // if user exits before completing all 3 sections.
    if (!savedSteps[stepId]) {
      try {
        const stepReport = buildSingleStepReport(stepId, result);
        const saved = await saveScore(user.id, user.name, user.college || '', stepReport);
        if (typeof saved?.streak === 'number') {
          updateUser({ streak: saved.streak });
        }
        setSavedSteps(prev => ({ ...prev, [stepId]: true }));
      } catch (err) {
        console.error('Failed to save step score:', err);
      }
    }
  };

  const goToNext = async () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
    else await handleFinish();
  };

  const handleFinish = async () => {
    const report = generateFinalReport(results.reading, results.listening, results.jam);
    setFinalReport(report);
    const saved = await saveScore(user.id, user.name, user.college || '', report);
    if (typeof saved?.streak === 'number') {
      updateUser({ streak: saved.streak });
    }
    setShowFinal(true);
  };

  const canProceed = () => {
    const stepId = STEPS[currentStep].id;
    return results[stepId] !== null;
  };

  if (showFinal && finalReport) {
    return (
      <div className="main-content" style={{ animation: 'fadeInUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <Trophy size={48} style={{ color: 'var(--accent-amber)', marginBottom: 16 }} />
            <h1>Assessment Complete!</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Here's your comprehensive AI-powered evaluation report</p>
          </div>
          <div className="glass-card" style={{ padding: 40, marginBottom: 32 }}>
            <div className="overall-score" style={{ fontSize: '5rem' }}>{finalReport.overall}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Overall Score</p>
            <span className={`performance-badge ${finalReport.performanceLevel.toLowerCase()}`} style={{ fontSize: '1.1rem', padding: '10px 28px', marginTop: 16 }}>
              {finalReport.performanceLevel === 'Expert' ? '💎' : finalReport.performanceLevel === 'Advanced' ? '🥇' : finalReport.performanceLevel === 'Intermediate' ? '🥈' : '🥉'} {finalReport.performanceLevel}
            </span>
          </div>

          {/* Section Scores */}
          <div className="cards-grid cards-grid-3" style={{ marginBottom: 32 }}>
            {[
              { label: 'Reading', score: finalReport.scores.reading, icon: <BookOpen size={24} />, color: 'var(--accent-blue)' },
              { label: 'Listening', score: finalReport.scores.listening, icon: <Headphones size={24} />, color: 'var(--accent-emerald)' },
              { label: 'Speaking', score: finalReport.scores.speaking, icon: <MessageSquare size={24} />, color: 'var(--accent-purple)' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, marginBottom: 12 }}>{s.icon}</div>
                <div className="stat-card-value" style={{ color: s.color }}>{s.score}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Skill Breakdown */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 32, textAlign: 'left' }}>
            <h3 style={{ marginBottom: 20 }}>Skill Breakdown</h3>
            {[
              { label: 'Pronunciation', score: finalReport.pronunciation, color: '#3b82f6' },
              { label: 'Fluency', score: finalReport.fluency, color: '#10b981' },
              { label: 'Listening', score: finalReport.listening, color: '#8b5cf6' },
              { label: 'Confidence', score: finalReport.confidence, color: '#f59e0b' },
              { label: 'Vocabulary', score: finalReport.vocabulary, color: '#06b6d4' },
              { label: 'Grammar', score: finalReport.grammar, color: '#ec4899' },
            ].map((s, i) => (
              <div key={i} className="skill-bar">
                <span className="skill-bar-label">{s.label}</span>
                <div className="skill-bar-track"><div className="skill-bar-fill" style={{ width: `${s.score}%`, background: s.color }} /></div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: s.color, minWidth: 35 }}>{s.score}</span>
              </div>
            ))}
          </div>

          {/* Strengths / Weaknesses */}
          <div className="cards-grid cards-grid-2" style={{ marginBottom: 32, textAlign: 'left' }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h4 style={{ color: 'var(--accent-emerald)', marginBottom: 12 }}>💪 Strengths</h4>
              {finalReport.strengths.length > 0 ? finalReport.strengths.map((s, i) => (
                <p key={i} style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>✅ {s}</p>
              )) : <p style={{ color: 'var(--text-muted)' }}>Keep practicing to build strengths!</p>}
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <h4 style={{ color: 'var(--accent-rose)', marginBottom: 12 }}>📈 Areas to Improve</h4>
              {finalReport.weaknesses.length > 0 ? finalReport.weaknesses.map((w, i) => (
                <p key={i} style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>🔸 {w}</p>
              )) : <p style={{ color: 'var(--text-muted)' }}>Excellent across all areas!</p>}
            </div>
          </div>

          {/* Tips */}
          {finalReport.tips.length > 0 && (
            <div className="glass-card" style={{ padding: 24, marginBottom: 32, textAlign: 'left' }}>
              <h4 style={{ color: 'var(--accent-amber)', marginBottom: 12 }}>💡 Personalized Recommendations</h4>
              {finalReport.tips.map((t, i) => <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>• {t}</p>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Dashboard</button>
            <button className="btn btn-primary" onClick={() => navigate('/leaderboard')}><Trophy size={16} /> View Leaderboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {STEPS.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCurrentStep(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem',
                background: i === currentStep ? 'var(--accent-blue)' : results[step.id] ? 'rgba(16,185,129,0.15)' : 'var(--glass-bg)',
                color: i === currentStep ? 'white' : results[step.id] ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}>
              {results[step.id] ? <CheckCircle2 size={16} /> : step.icon}
              {step.label}
            </button>
            {i < 2 && <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        ))}
      </div>

      {/* Current Assessment */}
      {currentStep === 0 && <ReadingParagraph onComplete={(r) => handleComplete('reading', r)} />}
      {currentStep === 1 && <ListeningPractice onComplete={(r) => handleComplete('listening', r)} />}
      {currentStep === 2 && <JamSession onComplete={(r) => handleComplete('jam', r)} />}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--glass-border)' }}>
        <button className="btn btn-secondary" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/test-portal')}>
          <ArrowLeft size={16} /> {currentStep > 0 ? 'Previous' : 'Back to Portal'}
        </button>
        {canProceed() && (
          <button className="btn btn-primary" onClick={goToNext}>
            {currentStep < 2 ? <>Next Assessment <ArrowRight size={16} /></> : <>Finish & Get Report <Trophy size={16} /></>}
          </button>
        )}
      </div>
    </div>
  );
}
