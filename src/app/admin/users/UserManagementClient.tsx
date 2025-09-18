'use client'

import { useState, useEffect } from 'react'
import { formatDateVE } from '@/lib/date-utils'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
  subscription_expires_at: string | null
}

export default function UserManagementClient() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  // Subscription modal state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [updatingSubscription, setUpdatingSubscription] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        setUsers(result.users || [])
      } else {
        throw new Error(result.error || 'Failed to fetch users')
      }
    } catch (error: any) {
      console.error('Error fetching users:', error)
      alert(`Error al obtener usuarios: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: id,
          updates: { is_active: !currentStatus }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        // Update local state
        setUsers(users.map(user =>
          user.id === id ? { ...user, is_active: !currentStatus } : user
        ))
      } else {
        throw new Error(result.error || 'Failed to update user')
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error)
      alert(`Error al actualizar usuario: ${error.message}`)
    }
  }

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserEmail.trim()) return

    setAddingUser(true)

    try {
      // Note: In a real implementation, you would need to handle user invitation
      // This is a simplified version that assumes the user already exists
      alert('La funcionalidad de invitación de usuarios se implementaría aquí. Por ahora, los usuarios deben registrarse ellos mismos.')
      setNewUserEmail('')
    } catch (error: any) {
      console.error('Error adding user:', error)
      alert(`Error al agregar usuario: ${error.message}`)
    } finally {
      setAddingUser(false)
    }
  }

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el usuario ${email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        // Update local state
        setUsers(users.filter(user => user.id !== id))
        alert('¡Usuario eliminado exitosamente!')
      } else {
        throw new Error(result.error || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert(`Error al eliminar usuario: ${error.message}`)
    }
  }

  // Subscription management functions
  const openSubscriptionModal = (user: UserProfile) => {
    setSelectedUser(user)
    // Format current subscription date for input if exists
    if (user.subscription_expires_at) {
      const date = new Date(user.subscription_expires_at)
      setCustomDate(date.toISOString().split('T')[0])
    } else {
      setCustomDate('')
    }
    setShowSubscriptionModal(true)
  }

  const closeSubscriptionModal = () => {
    setSelectedUser(null)
    setShowSubscriptionModal(false)
    setCustomDate('')
  }

  const updateSubscriptionDate = async (newExpirationDate: Date) => {
    if (!selectedUser) return

    setUpdatingSubscription(true)
    try {
      // Set time to midnight
      const dateAtMidnight = new Date(newExpirationDate)
      dateAtMidnight.setHours(0, 0, 0, 0)

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: { subscription_expires_at: dateAtMidnight.toISOString() }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        // Update local state
        setUsers(users.map(user =>
          user.id === selectedUser.id
            ? { ...user, subscription_expires_at: dateAtMidnight.toISOString() }
            : user
        ))
        closeSubscriptionModal()
        alert('¡Suscripción actualizada exitosamente!')
      } else {
        throw new Error(result.error || 'Failed to update subscription')
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error)
      alert(`Error al actualizar suscripción: ${error.message}`)
    } finally {
      setUpdatingSubscription(false)
    }
  }

  const addMonthsToDate = (months: number) => {
    const now = new Date()
    const futureDate = new Date(now.setMonth(now.getMonth() + months))
    return futureDate
  }

  const handleQuickSubscription = (months: number) => {
    const newDate = addMonthsToDate(months)
    updateSubscriptionDate(newDate)
  }

  const handleCustomDateSubmit = () => {
    if (!customDate) return
    const newDate = new Date(customDate + 'T00:00:00')
    updateSubscriptionDate(newDate)
  }

  const handleInvalidateSubscription = () => {
    if (!confirm('¿Estás seguro de que quieres invalidar esta suscripción? El usuario necesitará pagar nuevamente para acceder al sistema.')) {
      return
    }

    // Set subscription to expire yesterday at midnight
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    updateSubscriptionDate(yesterday)
  }

  const getSubscriptionDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null

    const expireDate = new Date(expiresAt)
    const now = new Date()
    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return daysLeft
  }

  const getSubscriptionStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { 
      status: 'expired', 
      text: 'Sin suscripción', 
      shortText: 'Sin sub',
      color: 'bg-gray-100 text-gray-800' 
    }

    const expireDate = new Date(expiresAt)
    const now = new Date()
    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) {
      return { 
        status: 'expired', 
        text: 'Vencida', 
        shortText: 'Exp',
        color: 'bg-red-100 text-red-800' 
      }
    } else if (daysLeft <= 7) {
      return { 
        status: 'expiring', 
        text: `${daysLeft} días restantes`, 
        shortText: `${daysLeft}d`,
        color: 'bg-yellow-100 text-yellow-800' 
      }
    } else {
      return { 
        status: 'active', 
        text: `${daysLeft} días restantes`, 
        shortText: `${daysLeft}d`,
        color: 'bg-green-100 text-green-800' 
      }
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Add User Section */}
      {/* <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar Usuario</h2>
        <form onSubmit={addUser} className="flex items-center space-x-4">
          <input
            type="email"
            placeholder="Dirección de email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            disabled={addingUser}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
          />
          <button
            type="submit"
            disabled={addingUser || !newUserEmail.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingUser ? 'Agregando...' : 'Agregar Usuario'}
          </button>
        </form>
        <p className="mt-2 text-sm text-gray-500">
          Nota: Los usuarios deben registrarse primero. Esta función es para habilitar usuarios existentes.
        </p>
      </div> */}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar usuarios por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 text-black rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
        />
      </div>

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchTerm ? 'No se encontraron usuarios que coincidan con tu búsqueda.' : 'No se encontraron usuarios.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li key={user.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${user.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {user.email}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {user.full_name || 'Sin nombre proporcionado'} • {user.role}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Registrado {formatDateVE(user.created_at)}
                        {user.role === 'USER' && user.subscription_expires_at && (
                          <> • Vence {formatDateVE(user.subscription_expires_at)}</>
                        )}
                        {user.role === 'USER' && user.subscription_expires_at && getSubscriptionDaysLeft(user.subscription_expires_at) !== null && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                            getSubscriptionDaysLeft(user.subscription_expires_at)! <= 0 ? 'bg-red-100 text-red-700' :
                            getSubscriptionDaysLeft(user.subscription_expires_at)! <= 7 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {getSubscriptionDaysLeft(user.subscription_expires_at)! <= 0 ? 'Vencida' :
                             getSubscriptionDaysLeft(user.subscription_expires_at)! === 1 ? '1 día' :
                             `${getSubscriptionDaysLeft(user.subscription_expires_at)} días`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Badges and buttons - stack on mobile, inline on desktop */}
                  <div className="flex flex-wrap items-center gap-2 sm:space-x-2 sm:flex-nowrap">
                    {user.role === 'ADMIN' && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}>
                        {user.role}
                      </span>
                    )}

                    {user.role !== 'ADMIN' && (
                      <>
                        {/* Manage Subscription button for USER role */}
                        {user.role === 'USER' && (
                          <button
                            onClick={() => openSubscriptionModal(user)}
                            className="inline-flex items-center px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 flex-shrink-0"
                          >
                            <span className="mr-1">⚙️</span>
                            <span className="hidden sm:inline">Gestionar Suscripción</span>
                            <span className="sm:hidden">Suscripción</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${user.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                        >
                          <span className="mr-1">{user.is_active ? '🟢' : '⚫'}</span>
                          <span className="hidden sm:inline">{user.is_active ? 'Activo' : 'Inactivo'}</span>
                          <span className="sm:hidden">{user.is_active ? 'On' : 'Off'}</span>
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="inline-flex items-center px-2 sm:px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 flex-shrink-0"
                        >
                          <span className="mr-1">🗑️</span>
                          <span className="hidden sm:inline">Eliminar</span>
                          <span className="sm:hidden">Del</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Subscription Management Modal */}
      {showSubscriptionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Gestionar Suscripción - {selectedUser.email}
              </h3>

              {/* Current subscription status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Estado Actual:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubscriptionStatus(selectedUser.subscription_expires_at).color}`}>
                    {getSubscriptionStatus(selectedUser.subscription_expires_at).text}
                  </span>
                </div>
                {selectedUser.subscription_expires_at && (
                  <div className="mt-2 text-sm text-gray-600">
                    Vence: {formatDateVE(selectedUser.subscription_expires_at)}
                  </div>
                )}
              </div>

              {/* Quick action buttons */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Acciones Rápidas:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickSubscription(1)}
                    disabled={updatingSubscription}
                    className="px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200 disabled:opacity-50"
                  >
                    +1 Mes
                  </button>
                  <button
                    onClick={() => handleQuickSubscription(3)}
                    disabled={updatingSubscription}
                    className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                  >
                    +3 Meses
                  </button>
                  <button
                    onClick={() => handleQuickSubscription(6)}
                    disabled={updatingSubscription}
                    className="px-3 py-2 bg-purple-100 text-purple-800 rounded-md text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                  >
                    +6 Meses
                  </button>
                  <button
                    onClick={() => handleQuickSubscription(12)}
                    disabled={updatingSubscription}
                    className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 disabled:opacity-50"
                  >
                    +12 Meses
                  </button>
                </div>
              </div>

              {/* Custom date picker */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Fecha Personalizada:</h4>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    disabled={updatingSubscription}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={handleCustomDateSubmit}
                    disabled={updatingSubscription || !customDate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Establecer Fecha
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">La fecha se establecerá a medianoche (12:00 AM)</p>
              </div>

              {/* Invalidate subscription section */}
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Zona de Peligro:</h4>
                <p className="text-xs text-red-600 mb-3">
                  Esto vencerá inmediatamente la suscripción. El usuario podrá iniciar sesión pero verá una página de pago.
                </p>
                <button
                  onClick={handleInvalidateSubscription}
                  disabled={updatingSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Invalidar Suscripción
                </button>
              </div>

              {/* Modal buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeSubscriptionModal}
                  disabled={updatingSubscription}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>

              {updatingSubscription && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-600">Actualizando suscripción...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}