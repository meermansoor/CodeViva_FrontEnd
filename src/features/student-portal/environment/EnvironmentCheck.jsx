import {
  Camera,
  CheckCircle2,
  Maximize,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkStudentEnvironment } from "./api/environmentCheckApi";
import "../styles/environment-check.css";

export default function EnvironmentCheck({ onContinue }) {
  const [checks, setChecks] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    checkStudentEnvironment().then(setChecks);
  }, []);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } catch {
      setFullscreen(false);
    }

    onContinue();
  };

  const status = checks || {};

  return (
    <section className="environment-card">
      <div className="environment-heading">
        <h1>Environment Check</h1>
        <p>We need to test your system peripherals and browser configuration for security compliance.</p>
      </div>

      <div className="environment-checks">
        <CheckRow icon={Camera} title="Webcam Device" detail="HD Video Camera (04cf:3101)" status={status.webcam} />
        <CheckRow icon={Mic} title="Microphone Device" detail="Internal microphone (active output)" status={status.microphone} />
        <CheckRow icon={Maximize} title="Fullscreen Mode" detail="Browser window must span fullscreen" status={fullscreen ? "passed" : "warning"} />
        <CheckRow icon={ShieldCheck} title="Security Compliance (Tab Switch)" detail="Focus tracking actively monitored" status={status.security} />
      </div>

      <button className="environment-action" type="button" onClick={enterFullscreen}>
        <Maximize size={13} />
        {fullscreen ? "Fullscreen Enabled" : "Enter Fullscreen to Continue"}
      </button>

      <p className="environment-note">Press F11 or click instructions to auto-configure fullscreen proctoring parameters.</p>
    </section>
  );
}

function CheckRow({ icon: Icon, title, detail, status }) {
  const passed = status === "passed";

  return (
    <div className="environment-check">
      <div className={`environment-icon ${passed ? "passed" : "warning"}`}>
        <Icon size={15} />
      </div>
      <div className="environment-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <b className={`check-status ${passed ? "passed" : "warning"}`}>
        {passed ? <><CheckCircle2 size={10} /> PASSED</> : "! WARNING"}
      </b>
    </div>
  );
}
