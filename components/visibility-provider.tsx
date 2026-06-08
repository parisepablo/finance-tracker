"use client"

import { createContext, useContext, useState } from "react"

type VisibilityContextType = {
  valuesVisible: boolean
  toggleVisibility: () => void
}

const VisibilityContext = createContext<VisibilityContextType>({
  valuesVisible: true,
  toggleVisibility: () => {},
})

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [valuesVisible, setValuesVisible] = useState(true)
  const toggleVisibility = () => setValuesVisible(prev => !prev)
  return (
    <VisibilityContext.Provider value={{ valuesVisible, toggleVisibility }}>
      {children}
    </VisibilityContext.Provider>
  )
}

export const useVisibility = () => useContext(VisibilityContext)
