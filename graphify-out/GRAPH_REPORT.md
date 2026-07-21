# Graph Report - 01Manager  (2026-07-08)

## Corpus Check
- 126 files · ~113,794 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 842 nodes · 1661 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a22a28c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- routes.tsx
- ai.ts
- TeamCapacity.tsx
- PlanQualityReview.tsx
- devDependencies
- devDependencies
- imports.ts
- TaskDetailPanel.tsx
- withTimeout
- TaskDetails.tsx
- projectExport.ts
- WeeklyReportPage.tsx
- slackNotifications.ts
- BoardCalendar.tsx
- app.ts
- taskDependencies.ts
- timeout.ts
- calendarSync.ts
- compilerOptions
- compilerOptions
- ProjectHealthDashboard.tsx
- compilerOptions
- api.ts
- compilerOptions
- MigrationPage.tsx
- PortfolioRoadmap.tsx
- report.ts
- riskScoring.ts
- api
- schedule.ts
- Light And Dark Mode QA Checklist
- capacity.ts
- compilerOptions
- tsconfig.json
- React + TypeScript + Vite
- ProjectMember
- vitest.config.ts
- tsconfig.json
- vercel.json
- README.md

## God Nodes (most connected - your core abstractions)
1. `withTimeout()` - 47 edges
2. `supabase` - 25 edges
3. `useAuth()` - 25 edges
4. `Task` - 22 edges
5. `TaskDetailPanel()` - 18 edges
6. `TaskDetails()` - 18 edges
7. `compilerOptions` - 17 edges
8. `api` - 16 edges
9. `compilerOptions` - 16 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `TaskDetailPanel()` --indirect_call--> `text()`  [INFERRED]
  frontend/src/components/TaskDetailPanel.tsx → backend/src/routes/search.ts
- `WeeklyReportPage()` --indirect_call--> `text()`  [INFERRED]
  frontend/src/pages/WeeklyReportPage.tsx → backend/src/routes/search.ts
- `AdvancedProjectOptions()` --indirect_call--> `level()`  [INFERRED]
  frontend/src/components/AdvancedProjectOptions.tsx → backend/src/routes/portfolio.ts
- `MigrationPage()` --indirect_call--> `text()`  [INFERRED]
  frontend/src/pages/MigrationPage.tsx → backend/src/routes/search.ts
- `estimateHistoryHint()` --calls--> `withTimeout()`  [EXTRACTED]
  backend/src/routes/ai.ts → backend/src/lib/timeout.ts

## Import Cycles
- None detected.

## Communities (44 total, 4 thin omitted)

### Community 0 - "routes.tsx"
Cohesion: 0.06
Nodes (46): App(), Button(), ButtonProps, GridBackground(), GridBackgroundProps, getInitials(), Layout(), Logo() (+38 more)

### Community 1 - "ai.ts"
Cohesion: 0.05
Nodes (56): @google/generative-ai, AssignmentRecommendation, buildReason(), buildTrainingSuggestion(), computeRecommendations(), extractRequiredSkills(), hasRelevantExperience(), MemberProfile (+48 more)

### Community 2 - "TeamCapacity.tsx"
Cohesion: 0.07
Nodes (50): AvailabilityRange, loadAvailability(), MemberCard(), MemberCardProps, SkillGapPanel(), SkillGapPanelProps, LEVEL_STYLE, LEVELS (+42 more)

### Community 3 - "PlanQualityReview.tsx"
Cohesion: 0.07
Nodes (31): level(), AdvancedProjectOptions(), AdvancedProjectOptionsProps, AssigneeSelector(), AssigneeSelectorProps, confidenceColor(), confidenceLabel(), PlanDiffModal() (+23 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (42): dependencies, clsx, lucide-react, motion, react, react-dom, react-router-dom, @supabase/supabase-js (+34 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (34): author, dependencies, cors, dotenv, express, multer, pdf-parse, @supabase/supabase-js (+26 more)

### Community 6 - "imports.ts"
Cohesion: 0.09
Nodes (28): normalizeChecklistItems(), buildJiraCsv(), buildLinearCsv(), checklistText(), csvEscape(), csvRow(), csvToObjects(), ImportRow (+20 more)

### Community 7 - "TaskDetailPanel.tsx"
Cohesion: 0.11
Nodes (29): ChatMessage, displayUser(), fileSizeLabel(), formatCompactDate(), formatDate(), formatMinutes(), incompleteQualityItems(), newChecklistItem() (+21 more)

### Community 8 - "withTimeout"
Cohesion: 0.13
Nodes (25): notifyUsers(), getProjectPermissions(), getProjectRole(), getTaskProjectId(), normalizeRole(), permissionsForRole(), ProjectPermissions, ProjectRole (+17 more)

### Community 9 - "TaskDetails.tsx"
Cohesion: 0.11
Nodes (26): ClientShareSettings, ProjectClientShare, ProjectInvitation, ProjectPermissions, ProjectRole, SlackIntegration, TaskTimeSummary, TimeEntry (+18 more)

### Community 10 - "projectExport.ts"
Cohesion: 0.17
Nodes (25): buildSummary(), bytesToBlobPart(), cleanFileName(), crc32(), docParagraph(), docTable(), downloadBlob(), escapeCsv() (+17 more)

### Community 11 - "WeeklyReportPage.tsx"
Cohesion: 0.12
Nodes (19): ReportAtRiskTask, ReportBlockedTask, ReportCompletedTask, ReportDelayedTask, ReportSections, ReportWorkloadMember, WeeklyReport, buildPlainText() (+11 more)

### Community 12 - "slackNotifications.ts"
Cohesion: 0.17
Nodes (19): ensureNotification(), getNotificationPreferences(), PreferenceKey, TYPE_TO_PREF, appBaseUrl(), enabledFor(), getSlackIntegration(), postToSlack() (+11 more)

### Community 13 - "BoardCalendar.tsx"
Cohesion: 0.15
Nodes (19): Task, buildConflictMap(), dayLoad(), djb2(), PALETTE, projectColors(), ProjectColorSet, ScheduledTask (+11 more)

### Community 14 - "app.ts"
Cohesion: 0.15
Nodes (11): allowedOrigins, app, supabase, router, upload, router, router, router (+3 more)

### Community 15 - "taskDependencies.ts"
Cohesion: 0.13
Nodes (16): DependencyTaskRef, EnrichedTask, enrichTasksWithDependencies(), fetchProjectDependencies(), TaskRef, DEFAULT_SETTINGS, filterTasks(), publicTask() (+8 more)

### Community 16 - "timeout.ts"
Cohesion: 0.16
Nodes (11): computeAchievements(), demoProjects, demoTasks, demoUsers, now, isConnectivityError(), projectRiskSummary(), riskLevel() (+3 more)

### Community 17 - "calendarSync.ts"
Cohesion: 0.18
Nodes (17): addDays(), CalendarConnection, disableTaskCalendarSync(), EventType, exchangeGoogleCode(), googleAuthUrl(), googleClient(), googleRequest() (+9 more)

### Community 18 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 20 - "ProjectHealthDashboard.tsx"
Cohesion: 0.18
Nodes (12): HealthAttentionItem, HealthWorkloadMember, ProjectHealthReport, activityIcon(), healthBorder(), healthColor(), priorityColor(), ProjectHealthDashboard() (+4 more)

### Community 21 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, jsx, module (+7 more)

### Community 22 - "api.ts"
Cohesion: 0.12
Nodes (13): AppNotification, CollaborationUser, HealthActivityItem, HealthBlockedTask, HealthBurndownPoint, HealthDeadline, HealthOverdueTask, HealthStats (+5 more)

### Community 23 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+6 more)

### Community 24 - "MigrationPage.tsx"
Cohesion: 0.14
Nodes (10): ImportAnalysis, ImportAnalysisFinding, ImportRow, ExportFormat, ImportSource, PRIORITY_COLORS, SEVERITY_COLORS, SEVERITY_ICON_COLORS (+2 more)

### Community 25 - "PortfolioRoadmap.tsx"
Cohesion: 0.26
Nodes (13): PortfolioProject, PortfolioWorkload, daysBetween(), DeadlineConflict, downloadCsv(), findDeadlineConflicts(), formatDate(), getBarStyle() (+5 more)

### Community 26 - "report.ts"
Cohesion: 0.27
Nodes (9): buildAtRiskTasks(), buildChangesFromLastWeek(), buildCompletedLastWeek(), buildCompletedThisWeek(), buildDelayedTasks(), buildWorkload(), daysAgo(), todayMidnight() (+1 more)

### Community 27 - "riskScoring.ts"
Cohesion: 0.28
Nodes (12): Project, RiskLevel, ExportContext, addRisk(), hasSkillMismatch(), levelFromScore(), norm(), RiskResult (+4 more)

### Community 28 - "api"
Cohesion: 0.27
Nodes (9): api, ClientPortalComment, ClientPortalPayload, ClientPortalTask, ClientProjectView(), formatDate(), statusStyles, taskBucket() (+1 more)

### Community 29 - "schedule.ts"
Cohesion: 0.57
Nodes (6): addDays(), buildDependencyAwareSchedule(), dependencyIds(), dependencyOrderedTasks(), startOfDay(), taskDuration()

### Community 30 - "Light And Dark Mode QA Checklist"
Cohesion: 0.33
Nodes (5): Global Component Checks, Light And Dark Mode QA Checklist, Manual Test Path, Page Checklist, Setup

### Community 32 - "compilerOptions"
Cohesion: 0.40
Nodes (4): compilerOptions, ignoreDeprecations, types, extends

### Community 33 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, baseUrl, extends, include

### Community 34 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 35 - "ProjectMember"
Cohesion: 0.67
Nodes (3): AddTaskForm(), Props, ProjectMember

### Community 36 - "vitest.config.ts"
Cohesion: 0.50
Nodes (3): __dirname, nm, testDir

## Knowledge Gaps
- **260 isolated node(s):** `name`, `version`, `description`, `main`, `test` (+255 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `text()` connect `imports.ts` to `WeeklyReportPage.tsx`, `TaskDetailPanel.tsx`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `TaskDetailPanel()` connect `TaskDetailPanel.tsx` to `TaskDetails.tsx`, `riskScoring.ts`, `imports.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `normalizeChecklistItems()` connect `imports.ts` to `withTimeout`, `ai.ts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _260 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `routes.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06010230179028133 - nodes in this community are weakly interconnected._
- **Should `ai.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05487269534679543 - nodes in this community are weakly interconnected._
- **Should `TeamCapacity.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06758832565284179 - nodes in this community are weakly interconnected._