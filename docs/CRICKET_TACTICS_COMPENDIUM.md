# Inside Edge — Outdoor 11-a-side Cricket Tactics Compendium

Version 1.0 — 11 August 2026

## Purpose and boundaries

This compendium is a decision framework for captains and coaches. It converts observations about an opposition batter and known capabilities of the selected bowlers into explainable bowling plans and legal field-setting suggestions.

It covers outdoor 11-a-side multi-day, 40/50-over and T20 cricket. It is not a substitute for the umpires, the Laws of Cricket, the playing conditions of the actual competition, player welfare requirements or a captain's reading of conditions.

The implementation data is in `src/modules/cricket/tactics/`. It contains:

- A controlled vocabulary for batter observations and bowler capabilities.
- Fourteen field presets with coordinates, roles and legality metadata.
- Sixteen composable bowling plans.
- A transparent first-pass ranking function.

## The governing principle

A sound recommendation follows this chain:

1. What can this bowler execute reliably?
2. Where is the bowler trying to land the ball and how will it move?
3. What stroke or decision is that delivery intended to produce?
4. What are the likely dismissal routes when it is executed?
5. Which fielders support those routes, prevent the easy release, or make the tempting option higher risk?
6. What is the acceptable miss and where is it protected?
7. What evidence would cause the captain to persist, adjust or abandon the plan?

This reflects the Australian Cricket Institute coaching sequence: intended ball → likely stroke → likely wicket → field that encourages a higher-risk stroke. The field must reveal and support the bowling plan. A field should not be moved reactively after every isolated shot.

The system must never recommend a delivery merely because a batter is thought to dislike it. A bowler without the required control or variation should receive a different plan.

## Facts, observations and inferences

User input should distinguish evidence quality:

| Confidence | Suggested meaning | Product behaviour |
|---|---|---|
| Low | Hearsay, one shot, memory without detail | Use only as a weak tie-breaker; label the plan as exploratory |
| Medium | Repeated observation in one innings or a trusted report | Use as a meaningful modifier |
| High | Repeated pattern across innings, video or reliable data | Allow a strongly tailored plan |

Do not turn a strength into a weakness by assumption. “Strong cover drive” does not automatically mean “likely to nick off driving.” It becomes an attacking opportunity only when paired with evidence such as hard hands, driving away from the body, early commitment, or a bowler who can move the ball late.

## Required inputs

### Batter profile

Minimum:

- Right- or left-handed.
- Known strengths and weaknesses, each with confidence and an optional note.

Useful additions:

- Position in the order and whether new to the crease.
- Preferred scoring zones: straight, cover, point, midwicket, square leg, fine.
- Front-foot/back-foot preference and crease depth.
- Timing: early, late, hard hands or soft hands.
- Response to swing, seam, pace, bounce, spin in, spin away and change of pace.
- Sweep, reverse sweep, use of feet and strike rotation.
- Observed dismissal modes and sample size.
- Whether behaviour changes under run-rate pressure.

### Bowler profile

The existing broad bowling style is not enough. Capture capabilities separately:

- Pace: high pace, steep bounce, skiddy trajectory, fourth-stump accuracy.
- Movement: away swing, in-swing, wobble seam, reverse swing.
- Pace-off: off-cutter, leg-cutter, slower ball.
- End-overs: wide yorker, straight yorker, controlled bouncer.
- Spin: stock control, turn into or away from this batter, flight/dip, top-spinner, arm ball/slider, wrong'un.
- Tactical skills: change of pace and crease angle.
- Control rating, available variations, preferred end and recent workload.

“Turns into/away from the batter” is a derived matchup property, not a fixed bowling style. For example, right-arm off-spin turns into a right-hander but away from a left-hander; left-arm orthodox is the reverse.

### Match context

- Format and current field-restriction phase.
- Score, wickets, target, required rate and balls remaining.
- New batter or established batter; current partnership.
- Pitch: seam, bounce, turn, pace, two-paced or low.
- Ball: new, old, reversing, wet or difficult to grip.
- Wind, slope and boundary dimensions.
- Which side has the short boundary.
- Local competition rules, junior restrictions and current umpire instructions.

## Field-setting model

### Team count

An 11-player fielding team comprises:

- One bowler.
- One wicketkeeper.
- Nine other fielders.

Therefore a field-board preset should display ten markers when the bowler is represented separately: the wicketkeeper and nine fielders. This corrects the common UI error of placing eleven markers plus an implicit bowler.

### Batter-relative orientation

Store one set of coordinates for a right-handed striker and mirror the horizontal coordinate for a left-handed striker. Position names such as cover and midwicket remain relative to the striker.

Always show the captain:

- Striker handedness.
- Bowler style, arm and over/around-the-wicket angle.
- The 30-yard circle when relevant.
- Short boundary and wind direction if known.
- The number of boundary riders used and allowed.

### Position dictionary

Depth is as important as the label. “Point” might be a close catcher, a single-saver or a boundary rider.

| Area | Common positions | Main tactical jobs |
|---|---|---|
| Behind wicket, off side | slips, fly slip, gully, short third, third | Catch outside edges; protect guides, ramps and late cuts |
| Square off side | backward point, point, deep point | Catch hard square edges; save singles; protect cut boundary |
| Front of square, off side | cover point, cover, extra cover, deep cover | Pressure or protect drives and slices |
| Straight off side | mid-off, long-off | Catch/check straight drive; protect lofted straight hit |
| Straight leg side | mid-on, long-on | Catch/check on-drive; protect lofted straight hit |
| Front of square, leg side | short midwicket, midwicket, deep midwicket, cow corner | Bat-pad/checked clip; pull/slog catch; boundary defence |
| Square leg side | short leg, leg gully, square leg, deep square | Bat-pad, glance, sweep, pull and hook |
| Fine leg side | leg slip, short fine, fine leg, long leg | Inside edge, glance, ramp, hook top edge |

Recommended product representation per fielder:

- Canonical position ID and display name.
- Coordinates.
- Side: off, leg or straight.
- Depth: close, saving one, inner ring, outfield or boundary.
- Whether behind square on the leg side.
- Tactical role in this specific plan.

## Laws and configurable restrictions

The base legality checks should be configurable by competition, not hard-coded as universal community rules.

### Universal MCC baseline

- At the instant of delivery, no more than two fielders other than the wicketkeeper may be behind the popping crease on the leg side (MCC Law 28.4).
- No fielder other than the bowler may encroach on the pitch before the ball reaches or passes the striker (Law 28.5).
- Significant pre-delivery fielder movement is restricted; permitted movement is limited under Law 28.6.
- Dangerous short-pitched bowling depends on speed, length, height, direction and the striker's skill; protective equipment does not remove that duty (Law 41.6).

### ICC reference defaults, not automatic local rules

Current ICC men's reference conditions used for modelling:

| Format/phase | Maximum outside 30-yard circle |
|---|---:|
| T20, overs 1–6 | 2 |
| T20, non-powerplay | 5 |
| ODI, overs 1–10 | 2 |
| ODI, overs 11–40 | 4 |
| ODI, overs 41–50 | 5 |

ICC ODI conditions also limit the leg side to five fielders. Slow-over-rate penalties can temporarily reduce the boundary-rider allowance. Reduced-over matches alter phases. Community 40-over, junior and local competitions frequently differ, so Inside Edge should require a saved rules profile.

### Recommended rules-profile fields

- Innings overs and phase boundaries.
- Maximum fielders outside the circle by phase.
- Maximum total leg-side fielders, if imposed.
- Maximum fielders behind square on the leg side.
- Short-ball limits and definitions by age/grade.
- Wide guidelines and interpretation.
- Bowler over/spell/workload limits.
- Close-fielding age and protective-equipment requirements.
- Slow-over-rate field penalty state.

## Bowler archetypes and default plans

These are starting points, not fixed templates.

| Bowler archetype | Stock plan | Primary wickets | Useful field emphasis | Poor fit / caution |
|---|---|---|---|---|
| Right/left pace with away movement | Playable fourth stump, full good length | Keeper/slip/gully edge | Cordon, point, cover pressure | No movement; uncontrolled half-volleys |
| Pace with in-swing/reverse | Full at off/middle | Bowled, lbw, inside edge | One slip, leg slip where justified, straight ring | Starting on leg stump |
| Wobble-seam seamer | Top of off/fourth stump | Either edge, bowled | Cordon and tight ring | Chasing excessive movement |
| High-pace/bounce bowler | Hard length plus occasional controlled short ball | Glove, splice, follow-up full ball | Behind-square boundary riders within legal limit | Juniors, poor height/direction control |
| Skiddy medium/fast bowler | Full stumps and cutters | Bowled/lbw, early miscue | Straight field and midwicket | Repeated back-of-length on true pitch |
| Off-spinner / finger spin into batter | Off stump, turn into pad; straight variation | Bat-pad, lbw, bowled | Short leg, slip, midwicket | Too straight feeds leg side |
| Finger or wrist spin away from batter | Threaten off, draw forward | Slip/keeper, stumped, wrong-line miscue | Slip, point/cover, long-on/off as phase permits | Starting too wide removes stumps |
| Wrist spinner | Stock turn plus top-spinner/wrong'un | Outside edge, bowled/lbw, top edge | Slip, attacking ring, protected slog zone | Variation without stock-ball control |
| Cutter/change-up bowler | Same action, pace off into surface | Early loft/miscue | Bigger boundary, long-on/off, deep midwicket/cover | Wet ball or true, skidding pitch |
| Yorker specialist | Wide or straight blockhole plan | Bowled/lbw, slice/edge | Protect the planned miss | Low control; slot-length miss |

## Batter observation → tactical response matrix

The “avoid” column is as important as the attack.

| Observation | Useful response | Likely dismissal routes | Avoid |
|---|---|---|---|
| Drives away from body | Playable fourth stump with away movement | Slip, keeper, gully | Half-volley width |
| Strong drive without a technical fault | Deny slot; use good length and patience | Frustration edge or across-line error | Treating strength alone as a weakness |
| Falls across front pad | Full off/middle with in-swing or skid | LBW, bowled, inside edge | Starting on leg stump |
| Strong cut | Remove width; tighter off-stump or body line | Cramped edge, bowled/lbw | Short and wide |
| Weak cut/square drive | Back-of-length fourth/fifth stump, if bounce supports it | Point/gully edge | Too short on a slow pitch |
| Strong pull/hook | Full/top-of-off with surprise short ball only | Front-pad, drive edge | Repeated sitter at hip height |
| Weak against short ball | Controlled short ball followed by full/top-of-off | Glove, top edge, bowled/lbw | Automatic use for juniors or inaccurate bowler |
| Strong leg side | Fourth-stump channel and off-side pressure | Edge; forced across-line shot | Pad-line release |
| Stays leg side of ball | Body line or straight yorker with legal field | Bowled, cramped pull | Width outside off unless protected intentionally |
| Plays early | Late movement, cutters, slower ball | Leading edge, early loft | Telegraphing pace off |
| Hard hands | Seam/swing around fourth stump; close square catcher | Slip/gully/bat-pad | Boundary-only defensive field |
| Deep in crease | Yorker/full stumps; occasional hard length | Bowled/lbw | Slot-length miss |
| Commits front foot early | Length contrast: hard length then full, or pace off | Splice, lbw/bowled | Random variation without setup |
| Vulnerable to yorker | Base of stumps with protected low-full-toss miss | Bowled/lbw | Repeating after control deteriorates |
| Vulnerable to change of pace | Same-action cutter/slower ball toward large side | Lofted miscue | Obvious back-of-hand cue or overpitch |
| Weak to turn away | Threaten off, stock turn away, straight variation | Slip/keeper, stumped, bowled | Starting outside reach |
| Weak to turn in | Outside off into pad/stumps, then straight ball | Bat-pad, lbw/bowled | Drag-down on leg stump |
| Uses feet to spin | Flight/dip, pace and length changes; keeper up | Stumped, long-on/off catch | Flat darts every ball |
| Crease-bound to spin | Draw forward with flight and stumps in play | Edge, bat-pad, stumped | Short enough to play safely back |
| Strong sweep | Change bounce/line; protect expected sweep and reverse | Top edge, lbw/bowled | Repeated drag-down |
| Poor strike rotation | Tight ring and repeatable stock ball | Forced loft or manufactured single error | Giving an automatic boundary rider to every gap |
| Strong straight boundary hitter | Wider channel or pace-off to large square boundary | Slice, edge, square miscue | Slot at stumps |
| Targets short boundary | Bowl and place field toward larger protected side | Long-boundary catch | Variations that naturally feed short side |
| Tailender | Stumps-first simplicity, optional safe short contrast | Bowled/lbw, glove | Overcomplicated six-ball variation show |

## Field preset catalogue

Each preset in the implementation has ten markers, fielder-specific roles and an outside-circle count.

| Preset ID | Core purpose | Key constraint |
|---|---|---|
| `pace_outswing_attack` | Edge-catching field for fuller away movement | Delivery must be playable and not a half-volley |
| `pace_inswing_attack` | Front-pad/stumps attack | Leg slip plus fine leg consumes the two behind-square leg slots |
| `pace_fourth_stump_pressure` | Dots and edge threat | Straight misses are less protected |
| `pace_body_bouncer` | Controlled body/short-ball trap | Safety and local short-ball checks mandatory |
| `pace_offside_contain` | Wide channel and off-side boundary defence | Pad-line miss is exposed |
| `pace_legside_contain` | Cramp room and protect pull/clip | Wide-down-leg risk; exactly two behind square |
| `death_wide_yorker` | Defend straight/leg arc with wide blockhole | Competition wide guideline must be known |
| `death_straight_yorker` | Protect low full straight miss | Slot-length miss is expensive |
| `pace_slower_ball` | Catch early lofts toward large boundary | Needs disguised change-up and suitable surface |
| `spin_away_attack` | Outside edge and stumping | Must start near enough to threaten stumps |
| `spin_into_attack` | Bat-pad and front-pad attack | Avoid feeding leg-side strength |
| `spin_sweep_trap` | Change contact point of sweep/reverse | Two behind-square leg maximum |
| `spin_charge_trap` | Disrupt use of feet | Keeper skill and straight boundary size matter |
| `spin_ring_pressure` | Deny rotation and force loft | Abandon if singles remain easy |

## Format and phase overlays

### Multi-day / two-day

- New ball: prioritise wicket probability and catching positions while movement exists.
- Established partnership: build pressure from both ends; do not let one bowler’s field undermine the other end's plan.
- Old ball: use cutters, reverse swing and spin according to actual conditions, not simply ball age.
- Wicket push: add catchers only if the bowler can still attack their intended zone.
- Run defence near a declaration/target: protect boundary routes while retaining the most plausible catcher.

### 40/50-over

- Powerplay: two-out fields require inner-ring solutions; avoid importing a five-boundary-rider death field.
- Middle overs: decide whether the objective is wicket, dot-ball pressure or matchup containment. Four-out rules can support an attacking catcher plus selective boundary protection.
- Final phase: define the protected miss before choosing wide yorker, straight yorker, pace-off or hard length.
- A 40-over local match may not use ICC ODI phase boundaries. Read the saved competition profile.

### T20

- Powerplay: accept calculated boundary risk for wicket chances or use the two riders to protect the bowler's worst miss.
- Middle: matchup plans should normally survive one boundary if execution was correct; do not abandon after one good shot.
- Death: recommend one primary plan and one movement-trigger response, not six unrelated variations.
- Required rate changes value: a single may be a win for the bowler at 12 required, but not when the batting side needs three per over.

## Conditions overlays

| Condition | Adjustment |
|---|---|
| Seaming/new-ball pitch | Slightly fuller good length; catching field remains valuable longer |
| Bouncy pitch | Hard length and splice/glove routes rise; fuller “driving length” may be shorter than usual |
| Slow/two-paced pitch | Pace-off and large-boundary catches rise; yorkers can still work but cutters need grip |
| Low pitch | Stumps, skid and sweep-lbw routes rise; indiscriminate short ball loses value |
| Turning pitch | Keep stumps in play, use close catchers where safe; vary trajectory rather than only turn amount |
| Flat pitch | Narrow plans to control, angles, pace changes and boundary geometry; do not promise movement |
| Wet/dewy ball | Downgrade high-grip variations and some yorkers; favour simpler seam-up control |
| Strong crosswind | Use only if the bowler understands its effect; field for drift/swing and aerial miscues |
| Short boundary | Direct the principal risk toward the longer side; do not merely add a rider while bowling into the short arc |

## Recommendation and ranking logic

The included deterministic ranking is intentionally simple and explainable:

1. Filter plans by format and phase.
2. Give the highest weight to bowler capabilities that directly support the plan.
3. Add batter-trait matches weighted by evidence confidence.
4. Penalise small-margin plans for low-control bowlers.
5. Reject or heavily penalise fields that exceed the current boundary-rider limit.
6. Add warnings when local rules are unconfirmed or a safety-sensitive plan is involved.
7. Return the top two or three plans with reasons, warnings and change triggers.

Recommended production improvements:

- Require at least one supporting bowler capability before presenting a plan as “recommended.”
- Treat conflicting batter observations explicitly rather than silently adding both scores.
- Model pairwise trait combinations. Example: `strong_front_foot_drive + drives_away_from_body` is more informative than either alone.
- Add ground geometry and protected-miss scoring.
- Penalise a plan that exposes a high-confidence strength unless the exposure is an intentional trap and the bowler supports it.
- Track outcomes by execution: intended ball, actual ball, stroke, runs and dismissal. Do not learn that a good plan failed when the ball was simply missed.
- Keep generated language templated and auditable; never invent a bowler capability.

## Recommended captain-facing output

For each selected bowler, show:

1. **Primary plan** — a one-sentence objective.
2. **Why it fits** — bowler strengths plus the observations used and their confidence.
3. **Ball** — line, length, movement/variation and crease angle.
4. **Sequence** — two or three deliveries as a pattern, not a compulsory script.
5. **Field** — visual field with each fielder's job.
6. **Dismissal routes** — maximum three, ordered.
7. **Protected miss** — where an imperfect delivery is intended to go.
8. **Do not miss** — the exposed scoring zone.
9. **Change triggers** — objective signals to persist or adjust.
10. **Legality/safety warnings** — specific to format, grade and player age.

Suggested wording:

> **Plan: fourth-stump patience.** This suits Alex's reliable seam control and the medium-confidence observation that the batter looks leg-side first. Bowl top-of-off/fourth stump with point, cover and midwicket saving one. The wickets are an outside edge or a forced across-line stroke. Accept a difficult straight single; do not feed the pads. Reassess if the batter rotates through cover twice in the over or Alex misses straight twice.

Avoid false certainty. Prefer “try,” “designed to,” and “most likely route” over “will get them out.”

## Safety and welfare guardrails

- Never auto-select the short-ball plan for a junior player.
- Require the captain to confirm local short-pitched delivery limits and grade/age rules.
- Downgrade or suppress the short-ball plan when bowler control is unknown or below the configured threshold.
- Consider the batter's skill, pace, height, direction and foreseeable injury risk. Helmet use does not make dangerous bowling acceptable.
- Close catchers need suitable skill, distance and protective equipment under local policy.
- Preserve existing workload restrictions. Cricket Australia's current junior guidance emphasises recovery and spell limits; local match rules remain authoritative.
- Do not frame intimidation or injury risk as a tactical objective.

## Validation checklist

Before displaying a field:

- Exactly ten markers: one keeper and nine fielders; bowler separate.
- No duplicate player assignments.
- No more than two behind square on the leg side, excluding keeper.
- Total leg-side limit satisfied if the competition imposes one.
- Boundary-rider count within the current phase limit.
- Slow-over-rate penalty applied if active.
- Field names and coordinates mirrored for batter hand.
- No fielder on the pitch.
- Plan line/length agrees with the field.
- Short boundary and protected miss are visible.
- Safety-sensitive positions and deliveries pass age/grade checks.

## Research basis and source quality

Rules and safety claims use primary governing-body material. Tactical recommendations are coaching heuristics: they are context-dependent and should be tested, explained and updated from real outcomes.

Primary sources:

- Marylebone Cricket Club, [Law 28 — The Fielder](https://www.lords.org/mcc/the-laws/the-fielder). Fielders behind square on the leg side, pitch encroachment and movement.
- Marylebone Cricket Club, [Law 41 — Unfair Play](https://www.lords.org/mcc/the-laws/unfair-play). Dangerous and unfair short-pitched bowling.
- Marylebone Cricket Club, [2017 Code, 4th edition (2026)](https://www.lords.org/getattachment/f955069b-ddb9-4e8e-9615-41c3071a3446/The-Laws-of-Cricket-2026-submitted-17-4-2026.pdf).
- ICC, [Playing Conditions index](https://www.icc-cricket.com/about/cricket/rules-and-regulations/playing-conditions). Current official Test, ODI and T20I documents.
- ICC, [Men's Standard ODI Playing Conditions — effective July 2025](https://images.icc-cricket.com/image/upload/prd/vsldugyo8ez8ezbaz9e6.pdf). Clauses 28.4 and 28.7.
- ICC, [Men's T20I Playing Conditions — effective July 2025](https://images.icc-cricket.com/image/upload/prd/qfnsie8fz6vhyl1pmcli.pdf). Clauses 28.4 and 28.7.
- Cricket Australia, [Junior Pace Bowling Workload Guidelines](https://play.cricket.com.au/community/resources/player-safety/junior-bowling-guidelines).

Coaching framework:

- Australian Cricket Institute, [How to Set Fields and Develop Plans](https://australiancricketinstitute.com/wp-content/uploads/2020/05/How-To-Set-Fields-And-Develop-Plans.pdf). Strength-led four-question field-setting process.
- Australian Cricket Institute, [4 Step Guide to Set Your Fields Effectively](https://australiancricketinstitute.com/4-step-guide-to-set-your-fields-effectively-when-bowling/). Delivery-to-shot-to-dismissal-to-field reasoning and common errors.

## Maintenance

- Review MCC Laws and ICC reference conditions at least annually.
- Store rules profiles with an effective date and source URL.
- Treat ICC settings as templates, never as proof of a local competition's rules.
- Have an accredited coach and experienced umpire review the plan library before public release.
- Version tactical plans independently from rules profiles so legal changes do not rewrite coaching content.
- Record user feedback and plan outcomes without presenting correlation as causal proof.

