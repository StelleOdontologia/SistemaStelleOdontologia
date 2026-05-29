import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Home from '@/pages/Home'
import Patients from '@/pages/Patients'
import Appointments from '@/pages/Appointments'

const App = () => (
  <TooltipProvider>
    <Toaster richColors position="top-right" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/agendamentos" element={<Appointments />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
)

export default App
