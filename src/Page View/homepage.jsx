import { useState, useRef } from "react";
import "./homepage.css";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ImageGenerator from "./ImageGenerator";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import VoiceToText from "./SpeechGenerator";
import logo from "../assets/logo.png"


const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  const imageRefs = useRef({});

  // Handle voice transcript
  const handleVoiceTranscript = (transcript) => {
    setTopic(transcript);
  };

  const handleGeneratePrompts = async () => {
    setLoading(true);
    setPrompts([]);
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const promptText = `
You are an expert AI image prompt generator.

Based on the user input exactly:
"""${topic}"""

Create exactly 5 AI image prompts related to the input.

Output a JSON array of 5 objects:
Keys: "scene" (1-5), "prompt" (detailed prompt string)
`;

      const generationResult = await model.generateContent(promptText);
      const rawResponse = await generationResult.response.text();
      const parsed = JSON.parse(rawResponse);
      setPrompts(parsed);
    } catch (error) {
      setPrompts([{ prompt: "Error: Failed to generate prompts. " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  // Generate all images in each interval
  const handleGenerateAllImages = async () => {
    setGeneratingAll(true);
    const refsArray = Object.values(imageRefs.current);

    for (let i = 0; i < refsArray.length; i++) {
      const ref = refsArray[i];
      if (ref && ref.generateImage) {
        await ref.generateImage();           // wait for this image to generate
        await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3 seconds
      }
    }
    setGeneratingAll(false);
  };

  // Download all images in a ZIP
  const handleDownloadAll = async () => {
    const zip = new JSZip();
    for (const { scene } of prompts) {
      const imgElement = document.querySelector(`#scene-img-${scene}`);
      if (imgElement) {
        const response = await fetch(imgElement.src);
        const blob = await response.blob();
        zip.file(`scene${scene}.png`, blob);
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "allscenes.zip");
  };

  return (
    <div className="prompt-generator">
      <div className="footer">
        @AshokLimbu
      </div>
      
<img src={logo} className="logo"/>
      
      {/* Voice Input Section */}
      <div className="voice-section">
        <VoiceToText
          targetId="topic-textarea"
          onTranscript={handleVoiceTranscript}
          lang="en-US"
        />
      </div>

      <textarea
        id="topic-textarea"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter your theme or idea... (or use voice input above)"
        rows={6}
        cols={30}
        className="topic-textarea"
      />
      
      <div>
        <button onClick={handleGeneratePrompts} className="main-btn">
          {loading ? "Generating Prompts..." : "Generate Prompts"}
        </button>
      </div>

      {prompts.length > 0 && (
        <>
          <div className="scenes-list">
            {prompts.map(({ scene, prompt }) => (
              <ImageGenerator
                key={scene}
                ref={(el) => (imageRefs.current[scene] = el)}
                scene={scene}
                prompt={prompt}
              />
            ))}
          </div>

          <div className="download-all" style={{ marginTop: "20px" }}>
            <button
              onClick={handleGenerateAllImages}
              className="main-btn secondary"
              style={{ marginRight: "10px" }}
            >
              {generatingAll ? "Generating..." : "Generate All Images"}
            </button>
            <button
              onClick={handleDownloadAll}
              className="main-btn secondary"
            >
              Download All Images (ZIP)
            </button>
          </div>
        </>
      )}
    </div>
  );
}