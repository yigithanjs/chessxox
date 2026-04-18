export function RulesPanel() {
  return (
    <details className="rules-disclosure">
      <summary>Rules</summary>
      <section className="panel rules-panel">
        <div className="panel__header">
          <p className="panel__eyebrow">Rules</p>
          <h2>How the board works</h2>
        </div>

        <ul className="rules-list">
          <li>Win by forming three of your pawns in a row, column, or diagonal.</li>
          <li>On your turn, either drop a new pawn onto any empty square or move one of your pawns.</li>
          <li>Pawns move one square forward and capture one square diagonally forward.</li>
          <li>Repeated positions, locked boards, and long loops end as a draw.</li>
        </ul>
      </section>
    </details>
  )
}
