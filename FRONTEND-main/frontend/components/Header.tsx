import React from 'react';
import { PageId, AnalysisResult } from '../types';
import { Search, Bell, Menu, ShieldCheck, Sparkles, PlusCircle } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  onNavigate: (page: PageId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({
  onMenuToggle,
  onNavigate,
  searchQuery,
  onSearchChange
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
      {/* Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-[#A3A3A3] hover:text-white p-2"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search alignments, history, roles..."
            className="w-full bg-[#121212]/50 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:border-[#94A3B8]/65 focus:ring-0 transition-all font-sans"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Analyze Now Quick-Action */}
        <button
          onClick={() => onNavigate('analyze')}
          className="hidden md:flex items-center gap-2 bg-[#F5F5F5] text-black hover:bg-white text-xs font-bold px-4 py-2 rounded-full transition-all tracking-wider uppercase"
        >
          <PlusCircle size={14} />
          <span>Analyze Now</span>
        </button>

        {/* Notifications and Badges */}
        <div className="flex items-center gap-3">
          {/* Notifications Trigger */}
          <button className="relative text-[#A3A3A3] hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/5">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* User Meta Information (Harsh) */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-[#F5F5F5] leading-none">Harsh</span>
              <span className="inline-flex items-center gap-1 text-[9px] text-[#94A3B8] uppercase font-sans tracking-wide mt-1.5 leading-none">
                <ShieldCheck size={10} />
                <span>AI Career Tool</span>
              </span>
            </div>
            {/* Avatar using the precise source from the original markdown reference */}
            <div className="relative cursor-pointer group" onClick={() => onNavigate('profile')}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_VA67UQ5sdRod8YL2ieLo7VGSg7p9VkA1N-HPRS2MqeF5RXrKxSgqDCm_PT3LZptIu2il2E-5iRNC9Bu18i_Rq9uV9m4BU7k3TWu4eK-JI7kVDo53x_xxZ9FlVYAb5uj6CwiitYe_6oOJ_LSBrjpV3ZiAhNExnDk1Nh0_IgmT5fk-k_PzMFecBlgTO2J8p-FNFezZwzijC8TV_03dUvrATBn7HET9ns0VzmPBTeFWPwehugEh50jOLZ_c55np0WyZfaWZcaID6dxv"
                alt="user portrait"
                className="w-8 h-8 rounded-full border border-white/20 object-cover grayscale transition-transform hover:scale-105"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-[#050505] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
