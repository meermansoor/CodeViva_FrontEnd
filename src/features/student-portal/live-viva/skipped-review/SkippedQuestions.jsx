import { ArrowRight, Mic } from "lucide-react";
import "../../styles/skipped-questions.css";

export default function SkippedQuestions({ questions, onAnswer, onSubmit }) {
  return (
    <section className="skipped-questions-card">
      <div className="skipped-heading">
        <div>
          <h1>Review Skipped Questions</h1>
          <p>You skipped {questions.length} out of 10 questions. You must complete or permanently skip them before submitting.</p>
        </div>
        <span>{questions.length} Skipped</span>
      </div>

      <div className="skipped-list">
        {questions.map((question) => (
          <article className="skipped-question" key={question.number}>
            <div>
              <span>QUESTION {question.number}</span>
              <strong>{question.text}</strong>
            </div>
            <button type="button" onClick={() => onAnswer(question.number)}>
              <Mic size={11} /> Answer Now
            </button>
          </article>
        ))}
      </div>

      <div className="skipped-actions">
        <button className="skip-all-button" type="button" onClick={onSubmit}>Skip All &amp; Submit</button>
        <button className="answer-selected-button" type="button" onClick={() => onAnswer(questions[0].number)}>
          Answer Selected <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}
