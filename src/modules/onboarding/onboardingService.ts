const ONBOARDING_KEY = 'inside_edge_onboarding_completed_v1';
const DEMO_MODE_KEY = 'inside_edge_demo_mode_v1';

export interface ClubSetupData {
  clubName: string;
  season: string;
  countryRegion?: string;
  teamName: string;
  teamType: 'Senior' | 'Junior';
  gradeName?: string;
  players: Array<{ name: string; primaryRole?: string }>;
  rulesUploaded?: boolean;
}

let inMemoryDemoState = false;
let inMemoryOnboardingCompleted = false;

export const OnboardingService = {
  isFirstRun(): boolean {
    if (typeof localStorage === 'undefined') return !inMemoryOnboardingCompleted;
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      return completed !== 'true' && !inMemoryOnboardingCompleted;
    } catch {
      return false;
    }
  },

  isDemoMode(): boolean {
    if (typeof localStorage === 'undefined') return inMemoryDemoState;
    try {
      return localStorage.getItem(DEMO_MODE_KEY) === 'true' || inMemoryDemoState;
    } catch {
      return inMemoryDemoState;
    }
  },

  enableDemoMode(): void {
    inMemoryDemoState = true;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(DEMO_MODE_KEY, 'true');
      } catch (err) {
        console.error('Failed to set demo mode:', err);
      }
    }
  },

  exitDemoMode(): void {
    inMemoryDemoState = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(DEMO_MODE_KEY);
      } catch (err) {
        console.error('Failed to exit demo mode:', err);
      }
    }
  },

  completeOnboarding(): void {
    inMemoryOnboardingCompleted = true;
    inMemoryDemoState = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        localStorage.removeItem(DEMO_MODE_KEY);
      } catch (err) {
        console.error('Failed to save onboarding completion:', err);
      }
    }
  },

  resetOnboardingState(): void {
    inMemoryOnboardingCompleted = false;
    inMemoryDemoState = false;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(ONBOARDING_KEY);
        localStorage.removeItem(DEMO_MODE_KEY);
      } catch (err) {
        // Fallback
      }
    }
  }
};
