import React, { useState, useEffect } from 'react';
import { PageId } from './types';
import { saveStoredRecords, getStoredMarketSources, saveStoredMarketSources } from './data';
import {
  clearAuth,
  fetchMe,
  loadHistoryAsRecords,
  logoutUser,
  onAuthStateChange,
} from './lib/api';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AnalyzeResume from './pages/AnalyzeResume';
import ResultsDashboard from './pages/ResultsDashboard';
import HistoryAnalytics from './pages/HistoryAnalytics';
import StoredMarketData from './pages/StoredMarketData';
import Profile from './pages/Profile';
import ChatAssistant from './pages/ChatAssistant';
import JobRecommendations from './pages/JobRecommendations';
import SavedJobs from './pages/SavedJobs';

import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<import('./types').AnalysisResult[]>([]);
  const [sources, setSources] = useState<import('./types').MarketDataSource[]>([]);
  const [activeAnalysisResult, setActiveAnalysisResult] = useState<import('./types').AnalysisResult | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (session) => {
      if (session?.user) {
        try {
          await fetchMe();
          setCurrentPage('dashboard');
          const apiRecords = await loadHistoryAsRecords();
          setRecords(apiRecords);
          saveStoredRecords(apiRecords);
        } catch {
          clearAuth();
          setRecords([]);
          setCurrentPage('login');
        }
      } else {
        clearAuth();
        setRecords([]);
      }
      setAuthReady(true);
    });

    setSources(getStoredMarketSources());
    return () => subscription.unsubscribe();
  }, []);

  const handleAddRecord = (record: import('./types').AnalysisResult) => {
    const updated = [record, ...records];
    setRecords(updated);
    saveStoredRecords(updated);
    setActiveAnalysisResult(record);
    setCurrentPage('results');
  };

  const handleClearHistory = () => {
    setRecords([]);
    saveStoredRecords([]);
    setActiveAnalysisResult(null);
  };

  const handleAddSource = (src: import('./types').MarketDataSource) => {
    const updated = [src, ...sources];
    setSources(updated);
    saveStoredMarketSources(updated);
  };

  const handleClearSources = () => {
    setSources([]);
    saveStoredMarketSources([]);
  };

  const handleLogout = async () => {
    await logoutUser();
    setActiveAnalysisResult(null);
    setRecords([]);
    setCurrentPage('login');
  };

  const handleLoginSuccess = () => {
    setCurrentPage('dashboard');
    loadHistoryAsRecords()
      .then((apiRecords) => {
        setRecords(apiRecords);
        saveStoredRecords(apiRecords);
      })
      .catch(() => setRecords([]));
    setSources(getStoredMarketSources());
  };

  const filteredRecords = records.filter((rec) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      rec.targetRole.toLowerCase().includes(term) ||
      rec.companyName.toLowerCase().includes(term) ||
      rec.candidateName.toLowerCase().includes(term)
    );
  });

  const isAuthPage = currentPage === 'login' || currentPage === 'signup';

  if (!authReady && !isAuthPage) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40 text-sm">
        Loading CVAlign…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] relative overflow-x-hidden antialiased font-sans selection:bg-white selection:text-black">
      <div className="fixed inset-0 pointer-events-none z-50 bg-image-grain opacity-[0.03]" />

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute right-0 bottom-0 w-[60%] h-full bg-gradient-to-t from-black via-transparent to-transparent opacity-65"></div>
        <div className="absolute right-[-10%] top-[-20%] w-[800px] h-[1200px] bg-gradient-to-br from-[#1A1A1A] to-transparent transform -rotate-12 blur-3xl opacity-25"></div>
        <div className="absolute right-[10%] bottom-0 w-[1px] h-full bg-white/[0.03]"></div>
        <div className="absolute right-[30%] bottom-0 w-[1px] h-[80%] bg-white/[0.02]"></div>
        <div className="absolute right-[50%] bottom-0 w-[1px] h-[60%] bg-white/[0.01]"></div>
        <div className="absolute bottom-[20%] right-0 w-full h-[1px] bg-white/[0.03]"></div>
      </div>

      <div className="flex relative z-10">
        {!isAuthPage && (
          <Sidebar
            currentPage={currentPage}
            onNavigate={(page) => setCurrentPage(page)}
            isOpen={isSidebarOpen}
            onCloseMobile={() => setIsSidebarOpen(false)}
          />
        )}

        <div
          className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
            !isAuthPage ? 'md:pl-64' : 'pl-0'
          }`}
        >
          {!isAuthPage && (
            <Header
              onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              onNavigate={(page) => setCurrentPage(page)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
            />
          )}

          <main className={!isAuthPage ? 'p-6 flex-1' : 'flex-1'}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-full"
              >
                {currentPage === 'login' && (
                  <Login onNavigate={(page) => setCurrentPage(page)} onLoginSuccess={handleLoginSuccess} />
                )}
                {currentPage === 'signup' && (
                  <Signup onNavigate={(page) => setCurrentPage(page)} onSignupSuccess={handleLoginSuccess} />
                )}
                {currentPage === 'dashboard' && (
                  <Dashboard onNavigate={(page) => setCurrentPage(page)} records={filteredRecords} />
                )}
                {currentPage === 'analyze' && (
                  <AnalyzeResume onNavigate={(page) => setCurrentPage(page)} onAnalysisComplete={handleAddRecord} />
                )}
                {currentPage === 'results' && (
                  <ResultsDashboard
                    onNavigate={(page) => setCurrentPage(page)}
                    result={activeAnalysisResult || (records.length > 0 ? records[0] : null)}
                    onSaveToHistory={handleAddRecord}
                  />
                )}
                {currentPage === 'history' && (
                  <HistoryAnalytics
                    onNavigate={(page) => setCurrentPage(page)}
                    records={filteredRecords}
                    onClearHistory={handleClearHistory}
                  />
                )}
                {currentPage === 'market-data' && (
                  <StoredMarketData
                    onNavigate={(page) => setCurrentPage(page)}
                    sources={sources}
                    onClearSources={handleClearSources}
                    onAddSource={handleAddSource}
                  />
                )}
                {currentPage === 'chat' && <ChatAssistant onNavigate={(page) => setCurrentPage(page)} />}
                {currentPage === 'jobs' && <JobRecommendations onNavigate={(page) => setCurrentPage(page)} />}
                {currentPage === 'saved-jobs' && <SavedJobs onNavigate={(page) => setCurrentPage(page)} />}
                {currentPage === 'profile' && (
                  <Profile onNavigate={(page) => setCurrentPage(page)} records={records} onLogout={handleLogout} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
