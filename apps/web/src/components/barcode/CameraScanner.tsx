'use client'

import { useEffect, useRef, useState, useCallback, ChangeEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

export interface CameraScannerProps {
  open: boolean
  onDetect: (barcode: string) => void
  onClose: () => void
  batchMode?: boolean
  onBatchModeChange?: (v: boolean) => void
  lastScannedLabel?: string
}

function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local')
  )
}

const READER_ID = 'ims-html5qr-reader'
const CAPTURE_ID = 'ims-html5qr-capture'

// ─── Photo-capture fallback (HTTP / non-secure context) ──────────────────────
function PhotoCaptureMode({
  onDetect,
  onClose,
  batchMode,
  onBatchModeChange,
  lastScannedLabel,
}: Omit<CameraScannerProps, 'open'>) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'decoding' | 'success' | 'error'>('idle')
  const [lastCode, setLastCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be reselected
    e.target.value = ''
    setStatus('decoding')
    setErrorMsg('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      // scanFile needs a mounted element with the given id
      const container = document.getElementById(CAPTURE_ID)
      if (!container) throw new Error('container missing')
      const qr = new Html5Qrcode(CAPTURE_ID, { verbose: false })
      const decoded = await qr.scanFile(file, false)
      qr.clear()
      setLastCode(decoded)
      setStatus('success')
      onDetect(decoded)
      if (!batchMode) {
        setTimeout(onClose, 600)
      } else {
        // Stay open for next scan
        setTimeout(() => setStatus('idle'), 1800)
      }
    } catch {
      setStatus('error')
      setErrorMsg('لم يُعثر على باركود في الصورة — حاول مجدداً')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
      {/* Hidden html5-qrcode mount point */}
      <div id={CAPTURE_ID} className="hidden" />

      {/* Instruction */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        الكاميرا المباشرة تتطلب HTTPS — انقر الزر لالتقاط صورة الباركود
      </p>

      {/* Feedback */}
      <div className="h-10 flex items-center justify-center">
        {status === 'decoding' && (
          <span className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
            <span className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline-block" />
            جار فك تشفير الصورة...
          </span>
        )}
        {status === 'success' && (
          <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400 animate-pulse">
            ✓ {lastCode}
          </span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-500">{errorMsg}</span>
        )}
        {status === 'idle' && batchMode && lastScannedLabel && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1 text-xs text-green-700 dark:text-green-400 text-center w-full">
            أُضيف: <strong>{lastScannedLabel}</strong>
          </div>
        )}
      </div>

      {/* Camera capture button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={status === 'decoding'}
        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        التقاط صورة الباركود
      </button>

      {/* Batch toggle */}
      {onBatchModeChange && (
        <button
          type="button"
          onClick={() => onBatchModeChange(!batchMode)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
            batchMode
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            مسح متعدد (Batch)
          </span>
          <span className={`w-8 h-4 rounded-full transition-colors relative ${batchMode ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${batchMode ? '-translate-x-0.5 right-0.5' : 'left-0.5'}`} />
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
      >
        {batchMode ? 'انتهاء المسح' : 'إلغاء'}
      </button>
    </div>
  )
}

// ─── Live-stream mode (HTTPS / localhost) ────────────────────────────────────
export function CameraScanner({
  open,
  onDetect,
  onClose,
  batchMode = false,
  onBatchModeChange,
  lastScannedLabel,
}: CameraScannerProps) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [flashCode, setFlashCode] = useState('')
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const lastScanRef = useRef<string>('')
  const mountedRef = useRef(false)
  const batchRef = useRef(batchMode)

  useEffect(() => { batchRef.current = batchMode }, [batchMode])

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current
    if (!s) return
    try {
      const state = s.getState()
      if (state === 2 || state === 3) await s.stop()
      s.clear()
    } catch { /* ignore */ }
    scannerRef.current = null
  }, [])

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return
    setStatus('starting')
    setErrorMsg('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mountedRef.current) return
      const reader = document.getElementById(READER_ID)
      if (!reader) { setErrorMsg('خطأ: عنصر الكاميرا غير موجود'); setStatus('error'); return }
      const qr = new Html5Qrcode(READER_ID, { verbose: false })
      scannerRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.6, formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13] },
        (decodedText) => {
          if (!mountedRef.current) return
          if (decodedText === lastScanRef.current) return
          lastScanRef.current = decodedText
          setTimeout(() => { lastScanRef.current = '' }, 1500)
          setFlashCode(decodedText)
          setTimeout(() => setFlashCode(''), 1500)
          if (!batchRef.current) {
            stopScanner().then(() => { if (mountedRef.current) onDetect(decodedText) })
          } else {
            onDetect(decodedText)
          }
        },
        () => {}
      )
      if (mountedRef.current) setStatus('active')
    } catch (err: unknown) {
      if (!mountedRef.current) return
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setErrorMsg('تم رفض الوصول للكاميرا. افتح إعدادات المتصفح وامنح الإذن.')
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setErrorMsg('لا توجد كاميرا متاحة على هذا الجهاز.')
      } else {
        setErrorMsg('تعذر تشغيل الكاميرا. ' + msg)
      }
      setStatus('error')
    }
  }, [onDetect, stopScanner])

  useEffect(() => {
    if (open) {
      mountedRef.current = true
      const t = setTimeout(() => startScanner(), 120)
      return () => {
        clearTimeout(t)
        mountedRef.current = false
        stopScanner()
        setStatus('idle')
        setFlashCode('')
        lastScanRef.current = ''
      }
    }
  }, [open, startScanner, stopScanner])

  const secure = isSecureContext()

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          dir="rtl"
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-0 overflow-hidden focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <Dialog.Title className="font-bold text-gray-900 dark:text-white text-sm">
                {secure ? 'مسح الباركود بالكاميرا' : 'التقاط صورة الباركود'}
              </Dialog.Title>
            </div>
            <Dialog.Close
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="إغلاق"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          {/* Body: photo-capture on HTTP, live stream on HTTPS */}
          {!secure ? (
            <PhotoCaptureMode
              onDetect={onDetect}
              onClose={onClose}
              batchMode={batchMode}
              onBatchModeChange={onBatchModeChange}
              lastScannedLabel={lastScannedLabel}
            />
          ) : (
            <>
              <div className="px-4 pt-3 pb-1">
                {status === 'error' ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{errorMsg}</p>
                    <button
                      onClick={() => { setStatus('idle'); startScanner() }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                ) : (
                  <>
                    {status === 'starting' && (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline-block" />
                        جار تشغيل الكاميرا...
                      </div>
                    )}
                    <div
                      id={READER_ID}
                      className="overflow-hidden rounded-xl bg-black"
                      style={{ minHeight: status === 'starting' ? 0 : 220 }}
                    />
                    <div className="h-8 flex items-center justify-center mt-2">
                      {flashCode ? (
                        <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400 animate-pulse">
                          ✓ {flashCode}
                        </span>
                      ) : status === 'active' ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">وجّه الكاميرا نحو الباركود</span>
                      ) : null}
                    </div>
                    {batchMode && lastScannedLabel && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5 text-center text-xs text-green-700 dark:text-green-400 mb-1">
                        أُضيف: <strong>{lastScannedLabel}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-4 pb-4 pt-1 space-y-2">
                {onBatchModeChange && (
                  <button
                    type="button"
                    onClick={() => onBatchModeChange(!batchMode)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      batchMode
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      مسح متعدد (Batch)
                    </span>
                    <span className={`w-8 h-4 rounded-full transition-colors relative ${batchMode ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${batchMode ? '-translate-x-0.5 right-0.5' : 'left-0.5'}`} />
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
                >
                  {batchMode ? 'انتهاء المسح' : 'إلغاء'}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
