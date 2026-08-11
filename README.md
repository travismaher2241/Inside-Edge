# Inside Edge — Cricket Coaching Application

**Inside Edge** is a standalone, cricket-native community coaching application designed from first principles. It helps community cricket coaches plan purposeful practice around real players, net facilities, and time constraints; run sessions from their phones; capture quick player observations; and connect match day outcomes to what is coached next.

---

## 🚀 Quick Start & Running Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### 3. Run Automated Unit & Integration Tests
```bash
npx vitest run
```

### 4. Build Production Bundle
```bash
npm run build
```

---

## 🏗️ Architecture & Core Modules

```
src/
├── types/
│   └── cricket.ts           # Schema definitions for Player, Facility, Session, Observation, Focus, Match
├── modules/
│   └── cricket/
│       ├── taxonomy.ts      # Cricket development domain taxonomy & status labels
│       ├── seedData.ts      # 16-player squad, 3-net facility, activity library & mock session
│       └── rotationEngine.ts# Net rotation allocation logic, idle player checks & net count recalculation
├── storage/
│   └── db.ts                # Offline-first LocalStorage persistence engine with versioned schemas
├── styles/
│   └── designTokens.css     # High-contrast outdoor-legible theme & CSS design system
├── components/
│   ├── layout/AppShell.tsx  # Persistent 5-tab mobile navigation bar
│   └── cricket/             # NetVisualizer, QuickObservationDrawer, FieldBoardModal
└── views/
    ├── HomeView.tsx         # Context-driven Home screen ("Good Evening, Coach", Next Up, Weekly Focus)
    ├── TrainView.tsx        # Session Builder, Net Manager & Duration Calculator
    ├── LiveModeView.tsx     # Zero-scroll outdoor phone viewport with countdown timer & rotation stepping
    ├── TeamView.tsx         # Squad Roster, Add Player, Development Focus creation & state transitions
    ├── MatchView.tsx        # Pre-match plan, post-match review & training priority generator
    └── LibraryView.tsx      # Problem-based drill search ("spin", "death bowling") & filter engine
```

---

## 📋 Features Implemented in V1 Vertical Slice

- ✅ **Context-Driven Home Screen**: Greeting, Next Up session status, weekly coaching focus derived from match reviews, continue planning progress, and workload warnings.
- ✅ **Net Manager & Rotation Engine**: Net lane builder, dynamic 3-to-2 net count recalculation, player role allocations, unassigned/idle warnings.
- ✅ **Live Training Mode**: Zero-scroll outdoor viewport, persistent countdown timer, active net cards, and fast player tap observation drawer (≤4s).
- ✅ **Player Development System**: Squad roster grid, cricket identity badges, Development Focus creation + state transitions (`Current Focus` -> `Developing` -> `Consistent` -> `Strength` -> `Archived`), and observation timeline.
- ✅ **Match-to-Training Continuity Loop**: Post-match review observations -> derived training priorities -> 1-click application to next training session.
- ✅ **Activity Library**: Search by coaching problem, category filters, 3–6 concise coaching cues, and add-to-session launcher.
- ✅ **Cricket Field Tactics Board**: Interactive oval canvas with RHB/LHB batter handedness, presets (`Standard 3-Slip Seam`, `Spin Ring 5-4`, `Death 5-Out Boundary`, `Blank Board` default), and draggable fielders.

---

## 🚧 Not Yet Implemented (Deferred Features)

The following features are intentionally deferred per the Product Blueprint roadmap and will be addressed in future phases:

1. **Phase 2 — AI Constraint-Aware Smart Planner**: Automated natural language prompt generation for full sessions (V1 currently uses deterministic rotation allocation & coach editing).
2. **Phase 3 — PlayCricket Integration & Official Match Scoring**: Deep integration with national competition administration systems (V1 focuses exclusively on coaching context notes & reviews).
3. **Phase 4 — Video Tagging & Frame Stepping**: Clip uploading, side-by-side comparison, and video annotation (deferred to Phase 4).
4. **Phase 5 — Computer Vision & 3D Ball Tracking**: Pose estimation, release-frame assistance, and pitch landing maps (explicitly prohibited in V1 per §15.2).
5. **Enterprise & Multi-Team Club Accounting**: Multi-team club subscriptions, payment processing, and organization dashboards.
