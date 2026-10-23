import SkippedQuestions from "./skipped-review/SkippedQuestions";
import VivaCompleted from "./completion/VivaCompleted";
import VivaSubmitted from "./submission/VivaSubmitted";
import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, ArrowRight, Clock3, Mic, ShieldAlert, Eye, Smartphone } from "lucide-react";
import { useFaceProctoring } from "./hooks/useFaceProctoring";
import { useObjectProctoring } from "./hooks/useObjectProctoring";
import io from "socket.io-client";
import axios from "axios";
import {
  endVivaSession,
  recordTabSwitch,
} from "./api/liveVivaApi";
import "../styles/live-viva.css";

export default function LiveViva({ sessionId, name, rollNo }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const socketRef = useRef(null);
  
  const [audioData, setAudioData] = useState(new Array(22).fill(12));
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentQuestionText, setCurrentQuestionText] = useState("Loading...");
  const [currentQuestionAudio, setCurrentQuestionAudio] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [currentQuestionTopic, setCurrentQuestionTopic] = useState("General");
  const [syllabusId, setSyllabusId] = useState(null);
  
  const API_BASE_URL = import.meta.env.VITE_RAG_API_URL || "http://192.168.100.100:8000";
  
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [recording, setRecording] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ended, setEnded] = useState(false);
  const [reviewingSkipped, setReviewingSkipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [skippedQuestionNumbers, setSkippedQuestionNumbers] = useState([]);
  const [warningCount, setWarningCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [proctorNotice, setProctorNotice] = useState(null);

  const handleProctorViolation = useCallback((violation) => {
    if (ended || completed) return;

    if (socketRef.current && sessionId) {
      socketRef.current.emit("proctor:violation", {
        sessionId,
        type: violation.type,
        label: violation.label,
        durationMs: violation.durationMs,
        timestamp: violation.timestamp
      });
    }

    setWarningCount((curr) => Math.min(3, curr + 1));
    setProctorNotice(violation.label);
    setTimeout(() => {
      setProctorNotice(null);
    }, 4500);
  }, [ended, completed, sessionId]);

  const { proctorStatus, proctorLabel, faceCount, gazeState } = useFaceProctoring(videoRef, {
    onViolation: handleProctorViolation,
    lookAwayThresholdMs: 2500,
    absenceThresholdMs: 3000,
    multipleFacesThresholdMs: 1200,
    gazeThresholdMs: 2200,
  });

  const handleObjectViolation = useCallback((violation) => {
    if (ended || completed) return;

    if (socketRef.current && sessionId) {
      socketRef.current.emit("proctor:violation", {
        sessionId,
        type: "OBJECT_DETECTED",
        label: violation.label,
        objectName: violation.objectName,
        confidence: violation.confidence,
        timestamp: violation.timestamp
      });
    }

    setWarningCount((curr) => Math.min(3, curr + 1));
    setProctorNotice(violation.label);
    setTimeout(() => {
      setProctorNotice(null);
    }, 5500);
  }, [ended, completed, sessionId]);

  const { detectedProhibited, hasProhibitedItem } = useObjectProctoring(videoRef, {
    onObjectViolation: handleObjectViolation,
    confidenceThreshold: 0.52,
    sustainedThresholdMs: 1000,
  });

  useEffect(() => {
    let mounted = true;

    if (sessionId) {
      axios.get(`http://localhost:5000/api/viva/session/${sessionId}`).then(res => {
        if (mounted && res.data.success) {
          const data = res.data.data;
          setQuestionNumber(data.currentQuestion.index + 1);
          setTotalQuestions(data.currentQuestion.total);
          setCurrentQuestionText(data.currentQuestion.question);
          setCurrentQuestionAudio(data.currentQuestion.audio_file || null);
          setCurrentQuestionId(data.currentQuestion.id || null);
          setCurrentQuestionTopic(data.currentQuestion.topic || "General Topic");
          setSyllabusId(data.syllabusId || null);
          
          if (data.timeLimitSec) {
            setSecondsLeft(Math.max(0, data.timeLimitSec - (data.elapsedTime || 0)));
          }
        }
      }).catch(err => console.error("Failed to fetch session", err));
    }

    socketRef.current = io("http://localhost:5000");
    socketRef.current.on("audio:transcript", (data) => {
      if (mounted) {
        setTranscript(data.text);
        setAnswered(true);
      }
    });
    
    socketRef.current.on("audio:error", (data) => {
      if (mounted) {
        setTranscript(`Error: ${data.error}. Please try again.`);
        setAnswered(false);
      }
    });

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!mounted) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Set up audio analyzer for real-time waveform
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateWaveform = () => {
          if (!mounted) return;
          analyser.getByteFrequencyData(dataArray);
          const newAudioData = Array.from({ length: 22 }, (_, i) => {
            const val = dataArray[i] || 0;
            return 12 + (val / 255) * 38; 
          });
          setAudioData(newAudioData);
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      })
      .catch(() => {});

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current === null) return null;
        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (secondsLeft !== null && secondsLeft <= 0 && !ended && !completed && sessionId) {
      exitSession();
    }
  }, [secondsLeft, ended, completed, sessionId]);

  useEffect(() => {
    let mounted = true;
    if (syllabusId && !currentQuestionAudio && currentQuestionId) {
      axios.get(`${API_BASE_URL}/api/questions/${syllabusId}`)
        .then(res => {
          if (!mounted) return;
          if (res.data && res.data.questions) {
            const matched = res.data.questions.find(q => q.id === currentQuestionId);
            if (matched && matched.audio_file) {
              setCurrentQuestionAudio(matched.audio_file);
            }
          }
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [syllabusId, currentQuestionAudio, currentQuestionId, API_BASE_URL]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !ended) {
        const nextWarning = Math.min(3, warningCount + 1);
        await recordTabSwitch({ warningNumber: nextWarning });
        setWarningCount(nextWarning);
        setShowTabWarning(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [ended, warningCount]);

  const formatTime = () => {
    if (secondsLeft === null) return "--:--";
    return `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(Math.floor(secondsLeft % 60)).padStart(2, "0")}`;
  };

  const handleRecord = async () => {
    if (recording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    } else {
      setTranscript("Listening and transcribing...");
      setAnswered(false);
      if (streamRef.current) {
        const audioTracks = streamRef.current.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0) {
          setTranscript("Error: No microphone track detected.");
          return;
        }

        // Record ONLY the audio track, never video frames
        const audioStream = new MediaStream(audioTracks);

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

        const mediaRecorder = mimeType
          ? new MediaRecorder(audioStream, { mimeType })
          : new MediaRecorder(audioStream);

        mediaRecorderRef.current = mediaRecorder;
        
        socketRef.current.emit("audio:start");
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            socketRef.current.emit("audio:chunk", event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          // Flush final audio buffers before signaling stop
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.emit("audio:stop", { sessionId });
            }
          }, 150);
        };
        
        mediaRecorder.start(250);
        setRecording(true);
      }
    }
  };

  const skipQuestion = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSkippedQuestionNumbers((current) => (
      current.includes(questionNumber) ? current : [...current, questionNumber]
    ));
    try {
      const res = await axios.post(`http://localhost:5000/api/viva/session/${sessionId}/action`, {
        command: "SKIP"
      });
      const data = res.data.data;
      if (data.status === "COMPLETED") {
        await exitSession();
        return;
      }
      setQuestionNumber(data.currentQuestion.index + 1);
      setTotalQuestions(data.currentQuestion.total);
      setCurrentQuestionText(data.currentQuestion.question);
      setCurrentQuestionAudio(data.currentQuestion.audio_file || null);
      setCurrentQuestionId(data.currentQuestion.id || null);
      setCurrentQuestionTopic(data.currentQuestion.topic || "General Topic");
      setSyllabusId(data.syllabusId || syllabusId);
      if (data.timeLimitSec) setSecondsLeft(Math.max(0, data.timeLimitSec - (data.elapsedTime || 0)));
      setTranscript("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axios.post(`http://localhost:5000/api/viva/session/${sessionId}/action`, {
        command: "SUBMIT_AUDIO",
        transcript: transcript
      });
      const res = await axios.post(`http://localhost:5000/api/viva/session/${sessionId}/action`, {
        command: "NEXT"
      });

      const data = res.data.data;
      if (data.status === "COMPLETED") {
        await exitSession();
        return;
      }

      setQuestionNumber(data.currentQuestion.index + 1);
      setTotalQuestions(data.currentQuestion.total);
      setCurrentQuestionText(data.currentQuestion.question);
      setCurrentQuestionAudio(data.currentQuestion.audio_file || null);
      setCurrentQuestionId(data.currentQuestion.id || null);
      setCurrentQuestionTopic(data.currentQuestion.topic || "General Topic");
      setSyllabusId(data.syllabusId || syllabusId);
      if (data.timeLimitSec) setSecondsLeft(Math.max(0, data.timeLimitSec - (data.elapsedTime || 0)));
      setAnswered(false);
      setRecording(false);
      setTranscript("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exitSession = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/viva/session/${sessionId}/complete`);
      const data = res.data.data;
      data.tabSwitches = warningCount;
      setFinalResults(data);
      setEnded(true);
      setCompleted(true);
    } catch (err) {
      console.error("Error ending session", err);
      // Fallback
      setEnded(true);
      setCompleted(true);
    }
  };

  return (
    <main className="live-viva">
      <header className="live-viva-header">
        <strong>CodeViva Portal</strong>
        <div className="live-viva-header-center"><span><Clock3 size={13} /> {formatTime()} <small>remaining</small></span><span>Question Progress: <b>Question {questionNumber} of {totalQuestions}</b></span></div>
        <div className="live-viva-student"><div className="live-viva-avatar">{(name && name !== "Sarah Smith") ? name.substring(0, 2).toUpperCase() : 'ST'}</div><div><strong>{(name && name !== "Sarah Smith") ? name : "Student"}</strong><span>ID: {rollNo || "N/A"}</span></div></div>
      </header>

      <section className="live-viva-layout">
        <div className="live-viva-main">
          <article className="question-card">
            <span>{currentQuestionTopic.toUpperCase()}</span>
            <h1>{currentQuestionText}</h1>
            {currentQuestionAudio && syllabusId && (
              <div style={{ marginTop: '15px' }}>
                <audio controls autoPlay src={`http://localhost:5000/api/audio/file/${syllabusId}/${currentQuestionAudio}`} style={{ height: '32px' }} />
              </div>
            )}
            {transcript && (
              <div className="transcript-box" style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b', fontStyle: 'italic' }}>
                <strong>Transcription: </strong>
                <p style={{ marginTop: '5px' }}>{transcript}</p>
              </div>
            )}
          </article>
          <div className="live-viva-actions">
            <button className={`record-button ${recording ? "recording" : ""}`} type="button" onClick={handleRecord} disabled={isSubmitting}><Mic size={15} />{recording ? "Stop Recording" : "Record Verbal Answer"}</button>
            <button className="skip-button" type="button" onClick={skipQuestion} disabled={isSubmitting}>Skip Question</button>
            <button className="next-question-button" type="button" onClick={nextQuestion} disabled={!answered || isSubmitting}>
              {isSubmitting ? "Evaluating..." : (questionNumber === totalQuestions ? "Finish Viva" : "Submit Answer & Next")} <ArrowRight size={13} />
            </button>
            <button className="exit-button" type="button" onClick={exitSession} disabled={isSubmitting}>Exit Viva Session</button>
          </div>
          {ended && <p className="session-ended">Viva session ended.</p>}
        </div>

        <aside className="live-viva-sidebar">
          <section className={`webcam-card ${hasProhibitedItem ? "prohibited-alert" : ""}`}>
            <div className="webcam-card-header">
              <h2>Live Proctored Feed</h2>
              <span className="webcam-card-live-dot"><i /> LIVE</span>
            </div>
            <div className={`live-webcam ${hasProhibitedItem ? "alert-frame" : ""}`}>
              <video ref={videoRef} autoPlay muted playsInline />
              <div className={`proctor-badge ${hasProhibitedItem ? "status-violation" : `status-${proctorStatus.toLowerCase()}`}`}>
                <i /> <span>{hasProhibitedItem ? `PROHIBITED: ${detectedProhibited?.name}` : (proctorStatus === "NORMAL" ? "PROCTOR SECURE" : proctorLabel)}</span>
              </div>
              {gazeState && (
                <div className={`proctor-iris-hud ${gazeState.isLookingAway ? "gaze-alert" : ""}`}>
                  <Eye size={11} /> <span className="proctor-iris-text">{gazeState.label}</span>
                </div>
              )}
            </div>
            {(proctorNotice || hasProhibitedItem) && (
              <div className="proctor-notice-banner">
                <AlertTriangle size={12} /> <span>{hasProhibitedItem ? `Warning: ${detectedProhibited?.name} detected in camera view!` : proctorNotice}</span>
              </div>
            )}
          </section>
          <section className="audio-card"><h2>Real-time Audio Analyzer <b>Mic Active</b></h2><div className="waveform">{audioData.map((height, index) => <i key={index} style={{ height: `${height}px` }} />)}</div></section>
          <section className="question-grid-card"><h2>Examination Progress Grid</h2><div className="question-grid">{Array.from({ length: totalQuestions }).map((_, index) => <button key={index} className={index + 1 === questionNumber ? "current" : index + 1 < questionNumber ? "answered" : ""} type="button" disabled>{index + 1}</button>)}</div></section>
        </aside>
      </section>
      
      {showTabWarning && (
        <div className="tab-warning-backdrop" role="presentation">
          <section className="tab-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="tab-warning-title">
            <div className="tab-warning-icon"><AlertTriangle size={24} /></div>
            <h2 id="tab-warning-title">Tab Switch Detected!</h2>
            <p>
              You have switched tabs or navigated away during your live viva
              session. This activity has been logged and reported to the proctor database.
            </p>

            <div className="warning-counter">
              <div><strong>Warning Counter</strong><b>{warningCount} of 3</b></div>
              <div className="warning-counter-track"><span style={{ width: `${(warningCount / 3) * 100}%` }} /></div>
              <small>Further violations will result in automatic viva cancellation and a grade of 0.</small>
            </div>

            <button className="return-viva-button" type="button" onClick={() => setShowTabWarning(false)}>
              Return to Viva
            </button>
          </section>
        </div>
      )}

      {completed && <div className="completion-overlay"><VivaCompleted results={finalResults} /></div>}

      {submitted && (
        <div className="completion-overlay">
          <VivaSubmitted results={finalResults} />
        </div>
      )}
    </main>
  );
}
