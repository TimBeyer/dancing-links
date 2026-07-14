export class AudioDirector {
  private context?: AudioContext

  unlock(): void {
    if (!this.context) this.context = new window.AudioContext()
    void this.context.resume()
  }

  step(): void {
    this.tone(155, 0.035, 'sine', 0.018)
  }

  echo(): void {
    this.tone(620, 0.08, 'sine', 0.055, 0)
    this.tone(930, 0.12, 'sine', 0.025, 0.06)
  }

  jam(): void {
    this.tone(105, 0.16, 'square', 0.045)
  }

  pickup(): void {
    this.tone(420, 0.12, 'triangle', 0.045, 0)
    this.tone(680, 0.18, 'triangle', 0.045, 0.1)
    this.tone(980, 0.24, 'triangle', 0.035, 0.21)
  }

  alert(): void {
    this.tone(125, 0.28, 'sawtooth', 0.07, 0)
    this.tone(92, 0.3, 'sawtooth', 0.06, 0.2)
  }

  success(): void {
    for (let index = 0; index < 4; index += 1) {
      this.tone(360 + index * 145, 0.24, 'triangle', 0.04, index * 0.11)
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    if (!this.context) return
    const startedAt = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startedAt)
    gain.gain.setValueAtTime(0.0001, startedAt)
    gain.gain.exponentialRampToValueAtTime(volume, startedAt + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration)
    oscillator.connect(gain)
    gain.connect(this.context.destination)
    oscillator.start(startedAt)
    oscillator.stop(startedAt + duration + 0.03)
  }
}
