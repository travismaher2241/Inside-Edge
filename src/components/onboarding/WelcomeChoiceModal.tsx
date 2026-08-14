import React from 'react';
import { Shield, Sparkles, Building2, Compass } from 'lucide-react';

interface WelcomeChoiceModalProps {
  isOpen: boolean;
  onSelectSetUpClub: () => void;
  onSelectExploreDemo: () => void;
}

export const WelcomeChoiceModal: React.FC<WelcomeChoiceModalProps> = ({
  isOpen,
  onSelectSetUpClub,
  onSelectExploreDemo
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to Inside Edge</h2>
          <p className="text-xs text-slate-400">
            Cricket coaching, organized around your players.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSelectSetUpClub}
            className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-left transition-all border border-emerald-500/50 shadow-lg group flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Set up my club
              </div>
              <p className="text-xs text-emerald-100 opacity-90">
                Create a clean club & team environment in ~3 minutes.
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={onSelectExploreDemo}
            className="w-full p-4 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl text-left transition-all border border-slate-800 flex items-start justify-between"
          >
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center gap-2 text-slate-100">
                <Compass className="w-4 h-4 text-amber-400" /> Explore demo club
              </div>
              <p className="text-xs text-slate-400">
                Try Smart Planner, Net Manager, and Playing Conditions with Western Park Demo CC.
              </p>
            </div>
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-500">
          Demo Mode does not contaminate your real club records.
        </p>
      </div>
    </div>
  );
};
