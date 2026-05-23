export async function triggerHaptic(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // web browser or haptics not available — silent no-op
  }
}
