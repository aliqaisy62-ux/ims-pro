import { useCallback, useRef } from 'react'

function webAudioBeep(freq: number, durationSec: number, type: OscillatorType, ctx: AudioContext) {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationSec)
  } catch { /* ignore */ }
}

export function useSoundFeedback() {
  const ctxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  const playBeep = useCallback(() => {
    const audio = new Audio('/sounds/beep.wav')
    audio.volume = 0.55
    audio.play().catch(() => {
      try { webAudioBeep(1800, 0.08, 'square', getCtx()) } catch { /* ignore */ }
    })
  }, [])

  const playBuzz = useCallback(() => {
    const audio = new Audio('/sounds/buzz.wav')
    audio.volume = 0.45
    audio.play().catch(() => {
      try { webAudioBeep(180, 0.22, 'sawtooth', getCtx()) } catch { /* ignore */ }
    })
  }, [])

  return { playBeep, playBuzz }
}
