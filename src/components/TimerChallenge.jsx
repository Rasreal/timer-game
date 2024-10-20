import { useRef } from "react";
import { useState } from "react";
import ResultModal from "./ResultModal";

/* eslint-disable react/react-in-jsx-scope */
export default function TimerChallenge({ title, targetTime }) {
  const [timeRemaining, setTimeRemaining] = useState(targetTime * 1000);

  const timer = useRef();
  const dialog = useRef();
  function handleStart() {
    timer.current = setInterval(() => {
      setTimeRemaining((prevTime) => prevTime - 10);
    }, 10);

    setStarted(true);
  }

  function handleStop() {
    setStarted(false);
    clearTimeout(timer.current);
    setExpired(false);
  }
  return (
    <>
      <ResultModal ref={dialog} targetTime={targetTime} result={false} />
      <section className="challenge">
        <h2>{title}</h2>
        <p className="challenge-time">
          {targetTime} секунд{targetTime > 1 ? "s" : ""}
        </p>
        <p>
          <button onClick={!timerStarted ? handleStart : handleStop}>
            Челленджды {timerStarted ? "аяқтау" : "бастау"}
          </button>
        </p>
        <p className={timerStarted ? "active" : undefined}>
          {timerStarted ? "Уақыт басталды" : "Әлі басталмаған"}
        </p>
      </section>
    </>
  );
}
