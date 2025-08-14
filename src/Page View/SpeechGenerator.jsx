import React, { useEffect, useRef, useState } from "react";
import "./homepage";

export default function VoiceToText({
  targetId = "out",
  lang = "en-US",
  continuous = true,
  interimResults = true,
  onTranscript,
}) {
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const updateTarget = (text) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (typeof onTranscript === "function") onTranscript(text);
  };

  const startListening = () => {
    if (listening) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    finalTranscriptRef.current = "";

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = interimResults;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      updateTarget(finalTranscriptRef.current + interim);
    };

    rec.onerror = (err) => {
      console.error("SpeechRecognition error", err);
      setListening(false);
      
      // Handle specific error types
      switch(err.error) {
        case 'network':
          alert("Network error: Please check your internet connection and try again.");
          break;
        case 'not-allowed':
          alert("Microphone access denied. Please allow microphone permissions.");
          break;
        case 'no-speech':
          alert("No speech detected. Please try speaking again.");
          break;
        case 'audio-capture':
          alert("No microphone found. Please check your microphone connection.");
          break;
        case 'service-not-allowed':
          alert("Speech recognition service is not allowed. Try using HTTPS.");
          break;
        default:
          alert(`Speech recognition error: ${err.error}`);
      }
    };

    rec.onend = () => {
      setListening(false);
      // Auto-restart on network errors (optional)
      // if (err && err.error === 'network') {
      //   setTimeout(() => startListening(), 1000);
      // }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setListening(false);
      alert("Failed to start speech recognition. Please try again.");
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
  };

  return (
    <div className="voice-to-text">
      <button
        type="button"
        className={`voice-btn ${listening ? "listening" : ""}`}
        onClick={startListening}
        disabled={listening}
        aria-pressed={listening}
      >
        {listening && <span className="pulse-dot"></span>}
        🎤 {listening ? "Listening..." : "Start Voice"}
      </button>

      <button
        type="button"
        className="stop-btn"
        onClick={stopListening}
        disabled={!listening}
      >
        ⏹️ Stop
      </button>
    </div>
  );
}