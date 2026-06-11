import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from '@/components/Header'
import Home from '@/pages/Home'
import Patients from '@/pages/Patients'
import Appointments from '@/pages/Appointments'
import ClinicFlow from '@/pages/ClinicFlow'
import Settings from '@/pages/Settings'
import ConfirmAppointment from '@/pages/ConfirmAppointment'
import Attendance from '@/pages/Attendance'
import PatientDetail from '@/pages/PatientDetail'
import Financial from '@/pages/Financial'
import { useLocation } from 'react-router-dom'

function AppLayout() {
  const location = useLocation()
  const isPublicPage = location.pathname.startsWith('/c/')

  return (
    <>
      {!isPublicPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/pacientes/:id" element={<PatientDetail />} />
        <Route path="/agendamentos" element={<Appointments />} />
        <Route path="/fluxo" element={<ClinicFlow />} />
        <Route path="/atendimento/:id" element={<Attendance />} />
        <Route path="/financeiro" element={<Financial />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/c/:token" element={<ConfirmAppointment />} />
      </Routes>
    </>
  )
}

const App = () => (
  <TooltipProvider>
    <Toaster richColors position="top-right" />
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </TooltipProvider>
)

export default App
