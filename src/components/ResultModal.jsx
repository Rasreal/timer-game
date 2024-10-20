/* eslint-disable react/react-in-jsx-scope */

import {useRef, forwardRef, useImperativeHandle} from "react";

const ResultModal = forwardRef(function ResultModal(
    {result, targetTime},
    ref
) {
    const dialog = useRef();
    useImperativeHandle(ref, () => {
        return {
            open() {
                dialog.current.showModal();
            }
        }
    });

    return (
        <dialog ref={dialog} className="result-modal">

            <h2>Sen {result ? "Uttyn" : "Utyldyn"}</h2>
            <p>
                Your target time was <strong>{targetTime} seconds</strong>
            </p>
            <p>
                You stopped timer with <strong>X seconds left</strong>
            </p>
            <form method="dialog">
                <button>Zhabu</button>
            </form>
        </dialog>
    );
});

export default ResultModal;
