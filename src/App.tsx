import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BarbershopProvider, useBarbershop } from './contexts/BarbershopContext';
import { Header } from './components/common/Header';
import { BottomTabBar, TabType } from './components/common/BottomTabBar';
import { ToastContainer } from './components/common/ToastContainer';
import { BookingWizard } from './components/booking/BookingWizard';
import { BarberPublicProfileModal } from './components/barbers/BarberPublicProfileModal';
import { AppointmentDetailModal } from './components/appointments/AppointmentDetailModal';
import { ClientQRModal } from './components/common/ClientQRModal';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';

// Views
import { HomeView } from './views/client/HomeView';
import { BarbersView } from './views/client/BarbersView';
import { MyAppointmentsView } from './views/client/MyAppointmentsView';
import { ProfileView } from './views/client/ProfileView';
import { BarberDashboardView } from './views/barber/BarberDashboardView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { Barber, Appointment } from './types';

const MainAppContent: React.FC = () => {
  const { currentRole, userProfile } = useAuth();
  const { isLoading } = useBarbershop();

  // Client Tab State
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Booking Flow Initial Params
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>(undefined);
  const [bookingBarberId, setBookingBarberId] = useState<string | undefined>(undefined);

  // Modals
  const [selectedBarberForProfile, setSelectedBarberForProfile] = useState<Barber | null>(null);
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<Appointment | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  const handleStartBooking = (serviceId?: string, barberId?: string) => {
    setBookingServiceId(serviceId);
    setBookingBarberId(barberId);
    setActiveTab('book');
  };

  const handleBookWithBarber = (barberId: string, serviceId?: string) => {
    setSelectedBarberForProfile(null);
    setBookingBarberId(barberId);
    setBookingServiceId(serviceId);
    setActiveTab('book');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center text-[#161514] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7D542B] to-[#9A6B3B] p-[1.5px] animate-spin">
          <div className="w-full h-full bg-[#FAF9F6] rounded-[14px]" />
        </div>
        <p className="font-display text-base font-semibold uppercase tracking-[0.2em] text-[#9A6B3B]">
          Cargando MONARCA BARBER...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#161514] flex flex-col selection:bg-[#9A6B3B] selection:text-[#FAF9F6] font-sans w-full max-w-full overflow-x-hidden">
      {/* Fixed Spatial Header */}
      <Header 
        onOpenProfile={() => setActiveTab('profile')} 
        onOpenQr={() => setIsQrModalOpen(true)} 
      />

      {/* Main Responsive Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-28 sm:pb-32 overflow-x-hidden">
        {/* Role-based Router */}
        {currentRole === 'admin' ? (
          <AdminDashboardView />
        ) : currentRole === 'barber' ? (
          <BarberDashboardView
            externalTab={activeTab === 'book' ? 'appointments' : activeTab}
            onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            isExternalScannerOpen={isQrModalOpen}
            onCloseExternalScanner={() => setIsQrModalOpen(false)}
          />
        ) : (
          /* Client Views */
          <>
            {activeTab === 'home' && (
              <HomeView
                onStartBooking={handleStartBooking}
                onOpenBarberProfile={(b) => setSelectedBarberForProfile(b)}
                onOpenAppointmentDetail={(a) => setSelectedAppointmentForDetail(a)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'barbers' && (
              <BarbersView
                onOpenBarberProfile={(b) => setSelectedBarberForProfile(b)}
                onBookWithBarber={(bId) => handleBookWithBarber(bId)}
              />
            )}

            {activeTab === 'book' && (
              <BookingWizard
                initialServiceId={bookingServiceId}
                initialBarberId={bookingBarberId}
                onBookingComplete={(app) => {
                  setActiveTab('appointments');
                  setSelectedAppointmentForDetail(app);
                }}
                onCancel={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'appointments' && (
              <MyAppointmentsView
                onOpenAppointmentDetail={(a) => setSelectedAppointmentForDetail(a)}
                onStartBooking={() => handleStartBooking()}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                onOpenBarberProfile={(b) => setSelectedBarberForProfile(b)}
                onStartBookingWithBarber={(bId) => handleBookWithBarber(bId)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}
          </>
        )}
      </main>

      {/* Barber Public Profile Lightbox/Modal */}
      <BarberPublicProfileModal
        barber={selectedBarberForProfile}
        onClose={() => setSelectedBarberForProfile(null)}
        onBookWithBarber={(barberId, serviceId) => handleBookWithBarber(barberId, serviceId)}
      />

      {/* Appointment Detail & Actions Modal */}
      <AppointmentDetailModal
        appointment={selectedAppointmentForDetail}
        onClose={() => setSelectedAppointmentForDetail(null)}
        userRole={currentRole}
      />

      {/* Instant Client VIP Pass & QR Modal (Only for Clients) */}
      {currentRole === 'client' && (
        <ClientQRModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          userProfile={userProfile}
        />
      )}

      {/* Floating Spatial Bottom Navigation Bar */}
      <BottomTabBar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        onOpenQr={() => setIsQrModalOpen(true)}
      />

      {/* PWA Smart Installation Prompt (Auto-hidden if already installed) */}
      <PWAInstallPrompt />

      {/* Global Toast System */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BarbershopProvider>
        <MainAppContent />
      </BarbershopProvider>
    </AuthProvider>
  );
}
