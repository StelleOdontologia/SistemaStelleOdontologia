import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Home from '@/pages/Home'
import Patients from '@/pages/Patients'
import Appointments from '@/pages/Appointments'
import ClinicFlow from '@/pages/ClinicFlow'

const App = () => (
  <TooltipProvider>
    <Toaster richColors position="top-right" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/agendamentos" element={<Appointments />} />
        <Route path="/fluxo" element={<ClinicFlow />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
)

export default App
