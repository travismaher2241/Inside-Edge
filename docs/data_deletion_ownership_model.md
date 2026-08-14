# Inside Edge Data Ownership & Entity Lifecycle Matrix (Phase 2A Formal Deliverable)

This document establishes the authoritative data ownership, access boundary, lifecycle retention, and deletion behavior across all Inside Edge domain entities prior to implementing self-service deletion features.

---

## 1. Complete Entity Ownership & Deletion Matrix

| Entity | Primary Owner | Who May Archive | Who May Delete | Coach Leaves Club Impact | Player Leaves Team Impact | Historical Retention | Cascading & Protection Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **User Account** | Individual Coach | N/A | Self (Coach) | Profile deleted; disassociates assistant link. Shared club data retained. | N/A | Personal settings removed; shared records preserved. | **Prohibited from deleting shared club data.** |
| **Club** | Head Coach (Club Admin) | Head Coach | Head Coach (14-day grace) | If Head Coach leaves, ownership must be transferred to another coach. | N/A | Archived for 30 days before purge. | Cascades to Teams, Sessions, Rulesets upon confirmed purge. |
| **Team** | Club | Head Coach | Head Coach | Team remains asset of the Club. | N/A | Past Match Reviews and Squad Stats preserved. | Deleting a Team soft-archives associated Match Records. |
| **Player** | Club / Team | Head Coach, Assistant | Head Coach | Player remains on Club Roster. | Soft-archived on Team Roster. | Historical observations & attendance preserved. | **Soft-archive by default.** Permanent delete anonymizes stats. |
| **Training Sessions** | Club | Head Coach | Head Coach | Session remains in Club Training Log. | Attendance record preserved in ledger. | Permanent historical record of club rotation. | Cascades block assignments, but leaves player ledger intact. |
| **Observations** | Submitting Coach | Submitting Coach | Head Coach, Submitting Coach | Observation text remains in Player Development file. | Retained on Player Profile for continuity. | Preserved indefinitely for player growth timeline. | Deleting player anonymizes observer ID. |
| **Development Focuses** | Head Coach | Head Coach | Head Coach | Focus state set to `ARCHIVED`. Confidential notes remain protected. | Focus archived under player history. | Archived focuses retained for development history. | Head Coach confidential notes strictly protected from assistant roles. |
| **Matches** | Team / Club | Head Coach | Head Coach | Match Record remains in Team Fixture list. | Player match stats retained. | Immutable fixture history. | Snapshot ruleset reference preserved. |
| **Match Reviews** | Team / Club | Head Coach | Head Coach | Review observations remain in Team roundup. | Player performance notes preserved. | Derived training priorities remain in library. | Cascades to derived issues, preserves linked sessions. |
| **Captain Reports** | Team / Club | Head Coach | Head Coach | Published report remains at public URL. | Captain report stats preserved. | Read-only public link remains functional. | Public links cannot alter administration rules. |
| **Videos / Media** | Club / Submitting Coach | Submitting Coach | Head Coach, Submitting Coach | Video remains in Activity/Player media library. | Video remains tagged to player profile. | Media storage reference retained. | Soft-delete removes cloud URL; metadata preserved. |
| **Playing Conditions Docs** | Club / Team | Head Coach | Head Coach | Document remains in Team Rules repository. | N/A | Document checksum and page text preserved. | **Prohibited from deleting while active ruleset references it.** |
| **Competition RuleSets** | Club / Team | Head Coach | Head Coach | Ruleset remains assigned to Team/Season. | N/A | Historical ruleset versions immutable (`v1`, `v2`). | Active ruleset cannot be deleted; must be archived first. |
| **Recommendation Records**| Team / Club | Head Coach | Head Coach | Audit record remains in Recommendation Log. | Audit rationale preserved. | Audit trail retained for coaching decision review. | Read-only historical decision log. |
| **Shared Club Resources** | Club | Head Coach | Head Coach | Resource remains available to all club teams. | N/A | Allocation history preserved. | Deleting resource removes it from future session wizards. |
| **Assistant Membership** | Club | Head Coach | Head Coach | Assistant role revoked; observations & sessions logged by coach retained. | N/A | Audit log retains `createdBy` attribution. | Revoking access removes team view permissions instantly. |

---

## 2. Key Lifecycle Principles

1. **Soft-Archiving Over Destructive Deletion**: Deleting players or teams defaults to soft-archiving (`state: 'ARCHIVED'`). Historical match statistics, observations, and attendance ledgers remain intact.
2. **Club Continuity**: Community cricket clubs outlast individual coach tenures. Deleting a coach profile disassociates auth credentials without destroying club session logs or player rosters.
3. **Immutable Rule & Match Snapshots**: Playing conditions documents and approved rulesets referenced by historical matches cannot be deleted while active match plans reference them.
