'use client'

import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; section?: string }
interface State { hasError: boolean; error: Error | null }

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div dir="rtl" style={{ padding: 32, maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          خطأ في {this.props.section ?? 'هذه الصفحة'}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, wordBreak: 'break-word' }}>
          {this.state.error?.message ?? 'حدث خطأ غير متوقع'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            padding: '8px 24px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }
}
