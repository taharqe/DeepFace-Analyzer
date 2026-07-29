import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import type { Concern } from '../catalogue/types';
import type { AgeBand } from './questions';

/**
 * Onboarding answers.
 *
 * Deliberately a reducer rather than scattered `useState` in each screen: the
 * tailoring step needs every answer at once, and the paywall needs to know the
 * user completed the questions. Screens stay presentational.
 *
 * [E] Nothing here persists. The captures cannot show whether a killed app
 *     resumes mid-onboarding. When that is decided, this is the single place
 *     to add storage - the screens do not touch state directly.
 */

export type Plan = 'weekly' | 'yearly';

export interface OnboardingState {
  age: AgeBand | null;
  concerns: Concern[];
  plan: Plan;
  subscribed: boolean;
}

type Action =
  | { type: 'setAge'; age: AgeBand }
  | { type: 'toggleConcern'; concern: Concern }
  | { type: 'setPlan'; plan: Plan }
  | { type: 'subscribe' }
  | { type: 'reset' };

const initial: OnboardingState = {
  age: null,
  concerns: [],
  /** Yearly is pre-selected - it carries the BEST VALUE flag in the capture. */
  plan: 'yearly',
  subscribed: false,
};

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'setAge':
      return { ...state, age: action.age };
    case 'toggleConcern':
      return {
        ...state,
        concerns: state.concerns.includes(action.concern)
          ? state.concerns.filter((c) => c !== action.concern)
          : [...state.concerns, action.concern],
      };
    case 'setPlan':
      return { ...state, plan: action.plan };
    case 'subscribe':
      return { ...state, subscribed: true };
    case 'reset':
      return initial;
  }
}

const Ctx = createContext<{
  state: OnboardingState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  }
  return ctx;
}
