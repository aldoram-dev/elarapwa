import React from 'react'

const InicioPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center select-none">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">¡Bienvenido!</h1>
      <p className="text-lg text-gray-600 max-w-xl">
        Selecciona una opción del menú lateral para comenzar a explorar el sistema.
      </p>
    </div>
  )
}

export default InicioPage
