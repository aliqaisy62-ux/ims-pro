declare module 'html5-qrcode' {
  export interface Html5QrcodeConfigs {
    fps?: number
    qrbox?: { width: number; height: number }
    aspectRatio?: number
    formatsToSupport?: number[]
    verbose?: boolean
  }

  export class Html5Qrcode {
    constructor(elementId: string, config?: { verbose?: boolean })
    start(
      cameraIdOrConfig: string | { facingMode: string },
      config: Html5QrcodeConfigs,
      qrCodeSuccessCallback: (decodedText: string, result: unknown) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): Promise<void>
    stop(): Promise<void>
    clear(): void
    getState(): number
    scanFile(imageFile: File, showImage?: boolean): Promise<string>
  }

  export class Html5QrcodeScanner {
    constructor(elementId: string, config: Html5QrcodeConfigs, verbose?: boolean)
    render(
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void
    ): void
    clear(): Promise<void>
  }
}
