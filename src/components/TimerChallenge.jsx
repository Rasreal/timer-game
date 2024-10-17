/* eslint-disable react/react-in-jsx-scope */
export default function TimerChallenge({title, targetTime}) {
     return(
          <section className="challenge">
               <h2>{title}</h2>
               <p className="challenge-time">
                    {targetTime} секунд{targetTime>1 ? 's' : ''}
               </p>
               <p>
                    <button>
                         Челленджды бастау
                    </button>
               </p>
               <p>
                    Уақыт басталды
               </p>
          </section>
     )
}