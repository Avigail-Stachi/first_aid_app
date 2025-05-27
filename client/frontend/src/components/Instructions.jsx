import React from "react";
import "../styles/Instructions.css"; 
const InstructionsViewer = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [instructions, setInstructions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/instructions`);
        const data = await res.json();
        setInstructions(data);
      } catch (err) {
        console.error("Failed to fetch instructions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInstructions();
  }, []);

  if (loading) return <div className="instructions-box">Loading instructions...</div>;
  if (!instructions) return <div className="instructions-box">No instructions found.</div>;

  const renderStep = () => {
    switch (step) {
      case 0:
        return <p>{instructions.brief}</p>;
      case 1:
        return <p>{instructions.detailed}</p>;
      case 2:
        return instructions.image ? (
          <img src={instructions.image} alt="Instructional" className="instruction-image" />
        ) : (
          <p>No image available.</p>
        );
      case 3:
        return instructions.video ? (
          <video controls src={instructions.video} className="instruction-video" />
        ) : (
          <p>No video available.</p>
        );
      default:
        return <p>All steps completed.</p>;
    }
  };

  return (
    <div className="instructions-box">
      <h3>First Aid Instructions</h3>
      {renderStep()}
      <div className="button-group">
        {step < 3 && (
          <button onClick={() => setStep((prev) => prev + 1)}>לא הבנתי</button>
        )}
        {step === 3 && <button onClick={onClose}>סיום</button>}
      </div>
    </div>
  );
};


export default Instructions;
