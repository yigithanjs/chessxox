import { useEffect, useRef, useState } from 'react'

type ControlsProps = {
  mode: 'bot' | 'local' | 'online'
  difficulty: 'easy' | 'hard'
  humanSide: 'white' | 'black'
  musicEnabled: boolean
  onModeChange: (mode: 'bot' | 'local' | 'online') => void
  onDifficultyChange: (difficulty: 'easy' | 'hard') => void
  onHumanSideChange: (side: 'white' | 'black') => void
  onRestart: () => void
  onMusicToggle: () => void
}

export function Controls({
  mode,
  difficulty,
  humanSide,
  musicEnabled,
  onModeChange,
  onDifficultyChange,
  onHumanSideChange,
  onRestart,
  onMusicToggle,
}: ControlsProps) {
  return (
    <section className="controls-strip" aria-label="Game controls">
      <Dropdown
        label="Game mode"
        value={mode}
        options={[
          { value: 'bot', label: 'Vs Bot' },
          { value: 'local', label: 'Local 2P' },
          { value: 'online', label: 'Online Room' },
        ]}
        onChange={(value) => onModeChange(value as 'bot' | 'local' | 'online')}
      />

      {mode === 'bot' ? (
        <>
          <Dropdown
            label="Bot difficulty"
            value={difficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'hard', label: 'Hard' },
            ]}
            onChange={(value) => onDifficultyChange(value as 'easy' | 'hard')}
          />

          <Dropdown
            label="Your side"
            value={humanSide}
            options={[
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' },
            ]}
            onChange={(value) => onHumanSideChange(value as 'white' | 'black')}
          />
        </>
      ) : null}

      <button type="button" className="control-chip control-chip--button" onClick={onRestart}>
        Restart match
      </button>
      <button
        type="button"
        className={`control-chip control-chip--button ${musicEnabled ? 'is-active' : ''}`}
        onClick={onMusicToggle}
        aria-pressed={musicEnabled}
      >
        {musicEnabled ? 'Music on' : 'Music off'}
      </button>
    </section>
  )
}

type DropdownOption = {
  value: string
  label: string
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const activeLabel = options.find((option) => option.value === value)?.label ?? value

  return (
    <div className="control-chip control-dropdown" ref={rootRef}>
      <span>{label}</span>
      <button
        type="button"
        className="control-dropdown__trigger"
        aria-label={`${label}, ${activeLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="control-dropdown__value">{activeLabel}</span>
        <span className="control-dropdown__caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="control-dropdown__menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`control-dropdown__option ${option.value === value ? 'is-active' : ''}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
