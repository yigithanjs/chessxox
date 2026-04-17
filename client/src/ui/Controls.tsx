type ControlsProps = {
  mode: 'bot' | 'local' | 'online'
  difficulty: 'easy' | 'hard'
  humanSide: 'white' | 'black'
  onModeChange: (mode: 'bot' | 'local' | 'online') => void
  onDifficultyChange: (difficulty: 'easy' | 'hard') => void
  onHumanSideChange: (side: 'white' | 'black') => void
  onRestart: () => void
}

export function Controls({
  mode,
  difficulty,
  humanSide,
  onModeChange,
  onDifficultyChange,
  onHumanSideChange,
  onRestart,
}: ControlsProps) {
  return (
    <section className="panel controls-panel">
      <div className="panel__header">
        <p className="panel__eyebrow">Game Controls</p>
        <h2>Pick your duel</h2>
      </div>

      <label className="control-field">
        <span>Game mode</span>
        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as 'bot' | 'local' | 'online')}
        >
          <option value="bot">Vs Bot</option>
          <option value="local">Local 2P</option>
          <option value="online">Online Room</option>
        </select>
      </label>

      {mode === 'bot' ? (
        <>
          <label className="control-field">
            <span>Bot difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => onDifficultyChange(event.target.value as 'easy' | 'hard')}
            >
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="control-field">
            <span>Your side</span>
            <select
              value={humanSide}
              onChange={(event) => onHumanSideChange(event.target.value as 'white' | 'black')}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
        </>
      ) : null}

      <button type="button" className="action-button" onClick={onRestart}>
        Restart match
      </button>
    </section>
  )
}
