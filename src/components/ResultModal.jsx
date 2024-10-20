/* eslint-disable react/react-in-jsx-scope */

import { useRef, forwardRef, useImperativeHandle } from "react";

const ResultModal = forwardRef(function ResultModal(
  { targetTime, remainingTime, onReset },
  ref,
) {
  const dialog = useRef();
  const formatRemainingTime = (remainingTime / 1000).toFixed(2);

  const userLost = remainingTime <= 0;

  const score = Math.round((1 - remainingTime / (targetTime * 1000)) * 100);

  useImperativeHandle(ref, () => {
    return {
      open() {
        dialog.current.showModal();
      },
    };
  });

  return (
    <dialog ref={dialog} className="result-modal">
      <h2>Sen {!userLost ? "Uttyn" : "Utyldyn"}</h2>
      {!userLost && <h2>Сенің ұпайын: {score}</h2>}
      <p>
        Your target time was <strong>{targetTime} seconds</strong>
      </p>
      <p>
        You stopped timer with{" "}
        <strong>{formatRemainingTime} seconds left</strong>
      </p>
      <form method="dialog" onSubmit={onReset}>
        <button>Zhabu</button>
      </form>
    </dialog>
  );
});

export default ResultModal;
