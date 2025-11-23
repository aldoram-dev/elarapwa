import React, { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Search, Edit2, Trash2, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Toggle from '../../components/ui/Toggle';
import { fetchProyectos, createProyecto, updateProyecto, deleteProyecto } from '@/lib/services/proyectoService';
import { Proyecto } from '@/types/proyecto';
import { SignedImage } from '@components/ui/SignedImage'
import { useFileUpload, useFilePreview } from '@/lib/hooks/useFileUpload'

export default function ProyectosConfigPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadProyectos();
  }, []);

  async function loadProyectos() {
    try {
      setLoading(true);
      const data = await fetchProyectos();
      setProyectos(data);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateProyecto() {
    setEditingProyecto(null);
    setIsModalOpen(true);
  }

  function handleEditProyecto(proyecto: Proyecto) {
    setEditingProyecto(proyecto);
    setIsModalOpen(true);
  }

  async function handleDeleteProyecto(id: string) {
    if (!confirm('¿Estás seguro de desactivar este proyecto?')) return;
    
    try {
      await deleteProyecto(id);
      await loadProyectos();
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      alert('Error al eliminar el proyecto');
    }
  }

  const filteredProyectos = proyectos.filter(p => 
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProyectos = filteredProyectos.filter(p => p.active !== false);
  const inactiveProyectos = filteredProyectos.filter(p => p.active === false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando proyectos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/70 p-6 md:p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                Gestión de Proyectos
              </h1>
              <p className="text-slate-600 mt-1 max-w-2xl">
                Administra proyectos, sucursales, edificios o tiendas. Estos aparecerán en el selector del header para filtrar información por ubicación.
              </p>
            </div>
          </div>
          <Button variant="success" onClick={handleCreateProyecto} icon={<Plus className="w-4 h-4" />}>
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl p-6 border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Proyectos</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{proyectos.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl p-6 border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Activos</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{activeProyectos.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl p-6 border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inactivos</p>
              <p className="text-3xl font-extrabold text-slate-400 mt-1">{inactiveProyectos.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200/70 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200/70">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Toggle
              checked={showInactive}
              onChange={setShowInactive}
              label="Mostrar inactivos"
              offLabel="No"
              onLabel="Sí"
              count={inactiveProyectos.length}
              size="md"
              aria-label="Mostrar proyectos inactivos"
            />
          </div>
        </div>

        {/* Proyectos Activos */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
            Proyectos Activos
          </h2>
          
          {activeProyectos.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchQuery ? 'No se encontraron proyectos activos' : 'No hay proyectos activos. ¡Crea el primero!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProyectos.map((proyecto) => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  onEdit={handleEditProyecto}
                  onDelete={handleDeleteProyecto}
                />
              ))}
            </div>
          )}
        </div>

        {/* Proyectos Inactivos */}
        {showInactive && inactiveProyectos.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold text-slate-500 mb-4 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-slate-400" />
              Proyectos Inactivos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {inactiveProyectos.map((proyecto) => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  onEdit={handleEditProyecto}
                  onDelete={handleDeleteProyecto}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear/editar proyecto */}
      {isModalOpen && (
        <ProyectoModal
          proyecto={editingProyecto}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false);
            loadProyectos();
          }}
        />
      )}
    </div>
  );
}

// Tarjeta de Proyecto
interface ProyectoCardProps {
  proyecto: Proyecto;
  onEdit: (proyecto: Proyecto) => void;
  onDelete: (id: string) => void;
}

function ProyectoCard({ proyecto, onEdit, onDelete }: ProyectoCardProps) {
  return (
    <div className="group bg-gradient-to-br from-white to-slate-50/50 rounded-xl border-2 border-slate-200/70 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Portada */}
      {proyecto.portada_url ? (
        <SignedImage
          path={proyecto.portada_url}
          bucket="documents"
          alt={`Portada de ${proyecto.nombre}`}
          className="w-full h-32 object-cover"
        />
      ) : (
        <div className="w-full h-32 bg-gradient-to-r from-indigo-100 to-blue-100" />
      )}

      <div className="p-5 flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{proyecto.nombre}</h3>
            {proyecto.active !== false && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Activo
              </span>
            )}
          </div>
        </div>
      </div>
      
      {proyecto.descripcion && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
          {proyecto.descripcion}
        </p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-slate-200/70">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(proyecto)}
          icon={<Edit2 className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(proyecto.id)}
          icon={<Trash2 className="w-3.5 h-3.5" />}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

// Modal para crear/editar proyecto
interface ProyectoModalProps {
  proyecto: Proyecto | null;
  onClose: () => void;
  onSave: () => void;
}

function ProyectoModal({ proyecto, onClose, onSave }: ProyectoModalProps) {
  const [nombre, setNombre] = useState(proyecto?.nombre || '');
  const [descripcion, setDescripcion] = useState(proyecto?.descripcion || '');
  const [active, setActive] = useState(proyecto?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [portadaUrl, setPortadaUrl] = useState<string | undefined>(proyecto?.portada_url)
  const { uploadFile, uploading, progress, formatFileSize } = useFileUpload({ optimize: true })
  const { previewUrls, createPreview, removePreview, clearAllPreviews } = useFilePreview()

  const handlePortadaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Preview inmediata
    createPreview(file, 'portada')
    // Subir al bucket documents/proyectos/portadas
    const result = await uploadFile(file)
    if (result.success && result.data) {
      setPortadaUrl(result.data.path)
    } else {
      alert(result.error || 'Error subiendo la portada')
    }
  }

  async function handleSave() {
    if (!nombre.trim()) return;

    setSaving(true);
    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        portada_url: portadaUrl,
        active,
      };

      if (proyecto) {
        await updateProyecto(proyecto.id, data);
      } else {
        await createProyecto(data);
      }

      onSave();
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      alert('Error al guardar el proyecto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={proyecto ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="cancel" onClick={onClose} size="lg">
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            size="lg"
            loading={saving}
          >
            {proyecto ? 'Actualizar Proyecto' : 'Crear Proyecto'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Portada */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <ImageIcon className="w-4 h-4 inline mr-1" /> Imagen de portada
          </label>
          {previewUrls.get('portada') || portadaUrl ? (
            <div className="relative">
              {previewUrls.get('portada') ? (
                <img src={previewUrls.get('portada')!} className="w-full h-40 object-cover rounded-xl border" />
              ) : (
                <SignedImage
                  path={portadaUrl!}
                  bucket="documents"
                  alt="Portada"
                  className="w-full h-40 object-cover rounded-xl border"
                />
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <label className="bg-white/90 px-3 py-1.5 rounded-lg border text-sm cursor-pointer hover:bg-white">
                  Cambiar
                  <input type="file" accept="image/*" className="hidden" onChange={handlePortadaSelect} />
                </label>
                <button
                  type="button"
                  onClick={() => { setPortadaUrl(undefined); removePreview('portada') }}
                  className="bg-white/90 px-3 py-1.5 rounded-lg border text-sm hover:bg-white"
                >
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
              <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-xs text-slate-500">Subir portada</span>
              <input type="file" accept="image/*" onChange={handlePortadaSelect} className="hidden" />
            </label>
          )}

          {uploading && (
            <p className="text-xs text-slate-500 mt-1">Subiendo... {Math.round(progress)}%</p>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 mb-1">
                ¿Qué es un Proyecto?
              </h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Los proyectos representan ubicaciones, sucursales, edificios o tiendas. Una vez creados, aparecerán en el selector del header para filtrar la información de la plataforma.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <Input
            label="Nombre del Proyecto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej: Sucursal Centro, Edificio Norte, Tienda Principal..."
            icon={<MapPin className="w-4 h-4" />}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la ubicación, características o propósito de este proyecto..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="text-sm font-semibold text-slate-900">Estado del Proyecto</label>
              <p className="text-xs text-slate-600 mt-0.5">
                Los proyectos inactivos no aparecerán en el selector del header
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-4 peer-focus:ring-emerald-500/20 transition-all">
                <div className="absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-all peer-checked:translate-x-7 shadow-md"></div>
              </div>
              <span className="ml-3 text-sm font-medium text-slate-900">
                {active ? 'Activo' : 'Inactivo'}
              </span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
