export function chime() {
  const context = new AudioContext()
  ;[880, 1175].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + index * 0.22
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.45)
  })
  navigator.vibrate?.([200, 100, 200])
}
