import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { updateUsuario } from '@/lib/services/usuarioService'
import { Input, Button } from '@components/ui'
import { SignedImage } from '@components/ui/SignedImage'
import { User, Mail, Phone, Shield, Image as ImageIcon, Save, X } from 'lucide-react'
import { supabase } from '@/lib/core/supabaseClient'

export default function MiPerfilPage() {
  const { perfil, user } = useAuth()
  const { uploadFile, uploading } = useFileUpload({ optimize: true })

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    avatar_url: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (perfil) {
      setFormData({
        nombre: perfil.name || '',
        email: perfil.email || '',
        avatar_url: perfil.avatar_url || '',
      })
    }
  }, [perfil])

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      let avatarUrl = formData.avatar_url

      if (avatarFile) {
        const result = await uploadFile(avatarFile)
        if (result.success && result.data) {
          avatarUrl = result.data.path
        } else {
          throw new Error(result.error || 'Error al subir el avatar')
        }
      }

      await updateUsuario(user.id, {
        nombre: formData.nombre,
        avatar_url: avatarUrl,
      })

      setFormData({ ...formData, avatar_url: avatarUrl })
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage({ type: 'success', text: '✓ Perfil actualizado correctamente' })
      
      setTimeout(() => window.location.reload(), 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el perfil' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex justify-center w-full">
      <form onSubmit={handleSubmit} className="space-y-10 max-w-2xl w-full">
        <div className="flex flex-col items-center gap-6 pb-10 border-b-2 border-slate-100">
          <div className="relative group">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-36 h-36 rounded-full object-cover border-4 border-violet-200 shadow-2xl group-hover:scale-105 transition-transform"
              />
            ) : formData.avatar_url ? (
              <SignedImage
                path={formData.avatar_url}
                bucket="documents"
                alt="Avatar"
                className="w-36 h-36 rounded-full object-cover border-4 border-violet-200 shadow-2xl group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl group-hover:scale-105 transition-transform">
                {formData.nombre.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {(avatarPreview || avatarFile) && (
              <button
                type="button"
                onClick={removeAvatar}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2.5 hover:bg-red-600 transition-all shadow-lg hover:shadow-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <label className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl cursor-pointer hover:from-violet-600 hover:to-fuchsia-700 transition-all font-medium shadow-lg hover:shadow-xl hover:scale-105">
              <ImageIcon className="w-5 h-5" />
              Cambiar foto
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </label>
            <p className="text-sm text-slate-500">JPG, PNG o WebP · Máximo 5MB</p>
            {uploading && (
              <p className="text-sm text-violet-600 font-medium animate-pulse">⏳ Subiendo imagen...</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3 justify-center">
            <div className="p-2 bg-violet-100 rounded-lg">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            Información Personal
          </h3>

          <div className="space-y-5">
            <Input
              label="Nombre Completo"
              icon={<User className="w-4 h-4" />}
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Tu nombre completo"
            />

            <div>
              <Input
                label="Correo Electrónico"
                icon={<Mail className="w-4 h-4" />}
                type="email"
                value={formData.email}
                disabled
                placeholder="correo@empresa.com"
              />
              <p className="text-xs text-slate-500 mt-2 ml-1">
                El correo electrónico no se puede cambiar. Contacta al administrador si necesitas actualizarlo.
              </p>
            </div>

          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex flex-col gap-5 w-full max-w-md">
              <div className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50/50 rounded-2xl border-2 border-violet-200 hover:border-violet-300 transition-all hover:shadow-md">
                <div className="flex flex-col items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm">
                    <Shield className="w-6 h-6 text-violet-600" />
                  </div>
                  <span className="text-sm font-semibold text-violet-600">Nivel de Acceso</span>
                </div>
                <p className="text-xl font-bold text-violet-900 text-center">
                  {perfil?.nivel || 'Usuario'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-5 rounded-2xl border-2 text-center font-semibold text-base ${
              message.type === 'success'
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-red-50 border-red-300 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-center gap-4 pt-8 border-t-2 border-slate-100">
          <Button
            type="submit"
            variant="primary"
            disabled={saving || uploading}
            loading={saving}
            icon={<Save className="w-5 h-5" />}
            className="px-8 py-3 text-base"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
