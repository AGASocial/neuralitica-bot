'use client'

import { useState, useEffect } from 'react'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  provider: string
  is_active?: boolean
}

export default function ProfilePageClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/get-profile')
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Profile data:', data)
        setProfile(data.profile)
        setName(data.profile.name || '')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!name.trim()) return

    setSaving(true)
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim()
        }),
      })

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, name: name.trim() } : null)
        setIsEditing(false)
        setMessage('Nombre actualizado correctamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Error al actualizar el nombre')
      }
    } catch (error) {
      setMessage('Error al actualizar el nombre')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Todos los campos de contraseña son requeridos')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas nuevas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setMessage('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      })

      if (response.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordForm(false)
        setMessage('Contraseña cambiada correctamente')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await response.json()
        setMessage(error.message || 'Error al cambiar la contraseña')
      }
    } catch (error) {
      setMessage('Error al cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-700">Error cargando perfil</h2>
            <p className="text-slate-500">No se pudo cargar la información del usuario</p>
          </div>
        </div>
      </div>
    )
  }

  const isEmailProvider = profile.provider === 'email'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('Error') || message.includes('error') 
            ? 'bg-red-50 text-red-800 border border-red-200' 
            : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-slate-200/80">
          <h2 className="text-xl font-semibold text-slate-800">Información Personal</h2>
          <p className="text-slate-600 text-sm mt-1">Actualiza tu información de perfil</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre completo
            </label>
            {isEditing ? (
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Ingresa tu nombre completo"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving || !name.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setName(profile.name || '')
                  }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-all duration-200"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex-1">
                  <span className="text-slate-800">{profile.name || 'Sin nombre configurado'}</span>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="ml-3 inline-flex items-center px-4 py-2 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              </div>
            )}
          </div>

          {/* Email Field (Read Only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Correo electrónico
            </label>
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-800">{profile.email}</span>
              <span className="ml-2 text-xs text-slate-500">(Solo lectura)</span>
            </div>
          </div>

          {/* Account Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de cuenta
              </label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-800 capitalize">{profile.provider}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado
              </label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile.is_active 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Password Change Section - Only for email accounts */}
          {isEmailProvider && (
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Cambiar Contraseña</h3>
                  <p className="text-slate-600 text-sm">Actualiza tu contraseña de acceso</p>
                </div>
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Cambiar Contraseña
                  </button>
                )}
              </div>

              {showPasswordForm && (
                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ingresa tu contraseña actual"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Ingresa tu nueva contraseña"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Confirma tu nueva contraseña"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                    >
                      {isSaving ? 'Cambiando...' : 'Cambiar Contraseña'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                        setMessage('')
                      }}
                      className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}