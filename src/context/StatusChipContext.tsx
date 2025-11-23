import React, { createContext, useContext, useState } from 'react'

interface StatusChip {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface StatusChipContextType {
  chips: StatusChip[]
  addChip: (chip: Omit<StatusChip, 'id'>) => void
  removeChip: (id: string) => void
}

const StatusChipContext = createContext<StatusChipContextType | undefined>(undefined)

export const StatusChipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chips, setChips] = useState<StatusChip[]>([])

  const addChip = (chip: Omit<StatusChip, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newChip = { ...chip, id }
    setChips(prev => [...prev, newChip])

    // Auto remove after duration
    if (chip.duration && chip.duration > 0) {
      setTimeout(() => {
        removeChip(id)
      }, chip.duration)
    }
  }

  const removeChip = (id: string) => {
    setChips(prev => prev.filter(chip => chip.id !== id))
  }

  return (
    <StatusChipContext.Provider value={{ chips, addChip, removeChip }}>
      {children}
    </StatusChipContext.Provider>
  )
}

export const useStatusChip = () => {
  const context = useContext(StatusChipContext)
  if (context === undefined) {
    throw new Error('useStatusChip must be used within a StatusChipProvider')
  }
  return context
}
