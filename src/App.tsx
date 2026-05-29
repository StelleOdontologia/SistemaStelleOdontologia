import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const App = () => (
  <TooltipProvider>
    <Toaster richColors position="top-right" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8"><h1 className="text-3xl font-bold">Stelle Odontologia</h1><p className="mt-4">Sistema em desenvolvimento</p></div>} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
)

export default App
