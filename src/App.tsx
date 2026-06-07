import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsListPage } from './pages/GroupsListPage';
import { CreateGroupPage } from './pages/CreateGroupPage';
import { GroupDetailsPage } from './pages/GroupDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { Toast } from './components/ui/Toast';
import { useAppStore } from './hooks/useAppStore';
import { useUserGroups, useExpenseMutations } from './hooks/useQueries';
import { RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const AppContent: React.FC = () => {
  const { user, loading: authLoading, profile } = useAuth();
  
  // Zustand state management
  const {
    view,
    selectedGroupId,
    toast,
    expenseModalOpen,
    editingExpense,
    setView,
    setSelectedGroupId,
    showToast,
    hideToast,
    closeExpenseModal,
  } = useAppStore();

  // Dynamic fetch user groups for context dropdown inside ExpenseModal
  const { data: groups = [] } = useUserGroups(profile?.id);
  const { createExpense, updateExpense } = useExpenseMutations(selectedGroupId);

  // Sync route based on Auth status
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (view === 'login' || view === 'signup' || view === 'forgot-password') {
          setView('dashboard');
        }
      } else {
        if (view !== 'signup' && view !== 'forgot-password') {
          setView('login');
        }
      }
    }
  }, [user, authLoading, view, setView]);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setView('group-details');
  };

  const handleSaveExpense = async (
    expenseId: string | null,
    groupId: string,
    title: string,
    amount: number,
    paidBy: string,
    splits: { profileId: string; amount: number }[],
    receiptUrl: string | null,
    splitType: 'equal' | 'percentage' | 'exact',
    notes: string | null
  ) => {
    if (!profile) return;

    if (!expenseId) {
      // Add expense
      await createExpense({
        title,
        amount,
        paidBy,
        splits,
        receiptUrl,
        createdBy: profile.id,
        splitType,
        notes,
      });
      showToast('Expense added successfully!', 'success');
    } else {
      // Update expense
      await updateExpense({
        expenseId,
        title,
        amount,
        paidBy,
        splits,
        receiptUrl,
        splitType,
        notes,
      });
      showToast('Expense updated successfully!', 'success');
    }

    setSelectedGroupId(groupId);
    setView('group-details');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-xs text-zinc-550 uppercase tracking-widest font-bold">
          Authenticating...
        </span>
      </div>
    );
  }

  // Render auth screens without header/navbar wrappers
  const renderAuthScreen = () => {
    switch (view) {
      case 'signup':
        return <Signup onNavigate={setView} showToast={showToast} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={setView} showToast={showToast} />;
      case 'login':
      default:
        return <Login onNavigate={setView} showToast={showToast} />;
    }
  };

  return (
    <div className="min-h-screen antialiased pb-24 transition-colors duration-300">
      {/* 1. Global toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* 2. Global Expense Modal */}
      {user && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={closeExpenseModal}
          groupContextId={view === 'group-details' ? selectedGroupId : null}
          groups={groups}
          editingExpense={editingExpense}
          onSave={handleSaveExpense}
          showToast={showToast}
        />
      )}

      {/* 3. Main Routing Engine with Framer Motion Screen Transitions */}
      {!user ? (
        <main className="max-w-3xl mx-auto px-4 py-8">{renderAuthScreen()}</main>
      ) : (
        <>
          <Header onNavigate={setView} />
          
          <main className="max-w-3xl mx-auto px-4">
            <AnimatePresence mode="wait">
              {view === 'dashboard' && (
                <DashboardPage
                  key="dashboard"
                  onNavigate={setView}
                  onSelectGroup={handleSelectGroup}
                  onAddExpenseClick={() => useAppStore.getState().openExpenseModal(null)}
                  showToast={showToast}
                />
              )}
              
              {view === 'groups-list' && (
                <GroupsListPage
                  key="groups-list"
                  onNavigate={setView}
                  onSelectGroup={handleSelectGroup}
                  showToast={showToast}
                />
              )}
              
              {view === 'create-group' && (
                <CreateGroupPage
                  key="create-group"
                  onNavigate={setView}
                  onSelectGroup={handleSelectGroup}
                  showToast={showToast}
                />
              )}
              
              {view === 'group-details' && selectedGroupId && (
                <GroupDetailsPage
                  key={`group-details-${selectedGroupId}`}
                  groupId={selectedGroupId}
                  onNavigate={setView}
                  onEditExpense={(expense) => useAppStore.getState().openExpenseModal(expense)}
                  onAddExpenseClick={() => useAppStore.getState().openExpenseModal(null)}
                  showToast={showToast}
                />
              )}
              
              {view === 'profile' && (
                <ProfilePage
                  key="profile"
                  onNavigate={setView}
                  showToast={showToast}
                />
              )}
            </AnimatePresence>
          </main>

          <Navbar
            currentView={view}
            onNavigate={setView}
            onAddExpenseClick={() => useAppStore.getState().openExpenseModal(null)}
          />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
