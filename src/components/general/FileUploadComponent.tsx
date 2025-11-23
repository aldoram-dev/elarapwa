import React, { useState } from 'react'
import { useFileUpload, useFilePreview, useFileDrop } from '../../lib/hooks/useFileUpload'

// =====================================================
// Componente de ejemplo para subir archivos
// =====================================================

interface FileUploadComponentProps {
  onUploadComplete?: (result: any) => void
  accept?: string[]
  maxFiles?: number
  uploadType?: 'avatar' | 'document' | 'general'
}

export function FileUploadComponent({
  onUploadComplete,
  accept = ['image/*', 'application/pdf'],
  maxFiles = 5,
  uploadType = 'general'
}: FileUploadComponentProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  
  const {
    uploading,
    optimizing,
    progress,
    error,
    uploadFile,
    uploadAvatar,
    uploadDocument,
    formatFileSize,
    reset
  } = useFileUpload({
    optimize: true,
    onOptimizationComplete: (result) => {
      console.log(`🔧 Optimización completada: ${result.compressionRatio.toFixed(1)}% de compresión`)
    }
  })

  const { previewUrls, createPreview, removePreview, clearAllPreviews } = useFilePreview()
  
  const { isDragActive, isDragReject, dragHandlers } = useFileDrop(
    (files) => {
      setSelectedFiles(files.slice(0, maxFiles))
      files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          createPreview(file, `file-${index}`)
        }
      })
    },
    accept,
    maxFiles
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files.slice(0, maxFiles))
    
    // Crear previews para imágenes
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        createPreview(file, `file-${index}`)
      }
    })
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      const results = []
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        let result

        switch (uploadType) {
          case 'avatar':
            result = await uploadAvatar(file, 'current-user-id') // Reemplazar con ID real
            break
          case 'document':
            result = await uploadDocument(file, 'uploads')
            break
          default:
            result = await uploadFile(file)
        }

        results.push(result)
      }

      onUploadComplete?.(results)
      setSelectedFiles([])
      clearAllPreviews()
      
    } catch (error) {
      console.error('Error subiendo archivos:', error)
    }
  }

  const removeFile = (index: number) => {
    removePreview(`file-${index}`)
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleReset = () => {
    reset()
    setSelectedFiles([])
    clearAllPreviews()
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">
        Subir {uploadType === 'avatar' ? 'Avatar' : uploadType === 'document' ? 'Documentos' : 'Archivos'}
      </h3>

      {/* Zona de Drop */}
      <div
        {...dragHandlers}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? isDragReject 
              ? 'border-red-400 bg-red-50' 
              : 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          type="file"
          multiple={maxFiles > 1}
          accept={accept.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            {isDragActive ? (
              <p className="text-blue-600 font-medium">
                {isDragReject ? '❌ Archivos no válidos' : '📁 Suelta los archivos aquí'}
              </p>
            ) : (
              <>
                <p className="text-gray-600 font-medium mb-1">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500">
                  Máximo {maxFiles} archivo{maxFiles > 1 ? 's' : ''} • {accept.join(', ')}
                </p>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-3">Archivos seleccionados:</h4>
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {/* Preview de imagen */}
                  {file.type.startsWith('image/') && (
                    <img
                      src={previewUrls.get(`file-${index}`)}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      {(uploading || optimizing) && (
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {optimizing ? '🔧 Optimizando...' : '📤 Subiendo...'}
            </span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Botones */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Subiendo...' : `Subir ${selectedFiles.length} archivo${selectedFiles.length !== 1 ? 's' : ''}`}
        </button>
        
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 <strong>Tip:</strong> Las imágenes se optimizan automáticamente para reducir el tamaño sin perder calidad.
        </p>
      </div>
    </div>
  )
}

export default FileUploadComponent
