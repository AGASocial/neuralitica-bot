'use client'

import { useEffect, useState } from 'react'

export default function SettingsClient() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [instructions, setInstructions] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    let mounted = true
    async function fetchSettings() {
      setLoading(true)
      setMessage('')
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load settings')
        if (mounted) setInstructions(json.settings?.system_instructions || '')
      } catch (e: any) {
        if (mounted) setMessage(e.message || 'Error loading settings')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchSettings()
    return () => { mounted = false }
  }, [])

  async function onSave() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instructions: instructions || null })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save settings')
      setMessage('Settings saved')
    } catch (e: any) {
      setMessage(e.message || 'Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-2 text-slate-900">Configuración del Sistema</h1>
        <p className="text-sm text-slate-700 mb-6">Define las instrucciones del sistema para guiar al asistente. Deje en blanco para usar las instrucciones predeterminadas.</p>
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-800">Instrucciones del Sistema</label>
          <textarea
            className="w-full h-128 p-3 border border-slate-300 rounded-md font-mono text-sm bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ingrese las instrucciones del sistema para guiar al asistente..."
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {loading && <span className="text-slate-600">Cargando...</span>}
          {message && <span className="text-slate-800">{message}</span>}
        </div>
      </div>
    </div>
  )
}
