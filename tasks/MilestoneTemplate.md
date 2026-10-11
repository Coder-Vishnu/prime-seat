# Milestone [VERSION] - [Milestone Title]

**Version:** [VERSION] (starting version, from package.json PATCH +1, BUILD reset to 0)  
**Date Created:** YYYY-MM-DD  
**Date Started:** YYYY-MM-DD (when Task 0 begins)  
**Date Completed:** YYYY-MM-DD (when all tasks complete)  
**Status:** Planning | In Progress | Complete  
**Based on:** [Reference document/issue/request]  

[Brief 1-2 sentence description of what this milestone accomplishes]

---

## Version Information

**Current Version (at milestone start):**
- **[repo-name]:** `[Check package.json in Task 0]`

**Target Version (after milestone completion):**
- **[repo-name]:** `[VERSION].N` (where N = number of tasks)

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `[VERSION]`
- Task 1 complete: `[VERSION].1`
- Task 2 complete: `[VERSION].2`
- etc.

This allows deployment and verification testing after each task.

**Git Branch:**
- **[repo-name]:** `vishnu-MMDDYY-[VERSION]-[repo-suffix]`

---

## Progress Summary

**Completion:** 0 of N tasks complete (0%)

| Task                             | Priority | Status  | Version     | Deployed / Verified |
| -------------------------------- | -------- | ------- | ----------- | ------------------- |
| Task 0: Milestone Initialization | SETUP    | Pending | [VERSION]   | -                   |
| Task 1: [Task Name]              | HIGH     | Pending | [VERSION].1 | -                   |
| Task 2: [Task Name]              | MEDIUM   | Pending | [VERSION].2 | -                   |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:** [What this milestone aims to achieve]

**Scope:**
- [Key deliverable 1]
- [Key deliverable 2]
- [Key deliverable 3]

**Estimated Effort:** [X hours / Y days]  
**Actual Effort:** [Track actual time spent]  

**Dependencies:**
- [Milestone or feature this depends on]

---

## Git Workflow Policy

**CRITICAL: The agent must NOT commit or push code directly to main.**

**Antigravity Agent Responsibilities:**
- Write and modify code files using targeted tools
- Run type checks, linting, and tests to verify changes
- Prepare clean diffs and code for developer review
- Create feature branches ONLY (`git checkout -b`, `git push -u origin`)

**Developer Responsibilities:**
- Review code changes in their preferred git client
- Create commits with appropriate messages
- Push commits to feature branch
- Create and merge pull requests
- Deploy to environments

---

## Task 0: Milestone Initialization (SETUP)

**Purpose:** Initialize milestone by checking current version, creating feature branch, and updating milestone state.  
**Estimated Time:** 5-10 minutes  
**Status:** Pending  

### Step 0.1: Check Current Version
Read `package.json` (or version file) to verify starting version matches expectations.

### Step 0.2: Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b vishnu-MMDDYY-[VERSION]-[repo-suffix]
git push -u origin vishnu-MMDDYY-[VERSION]-[repo-suffix]
```

### Step 0.3: Update Milestone Header
Update this document with confirmed version and record `Date Started`.

### Verification Gate
- [ ] Feature branch created and tracked upstream
- [ ] Milestone document header updated

---

## Task 1: [Task Name] (PRIORITY)

**Estimated Time:** [X hours]  
**Actual Time:** [Fill in when complete]  
**Status:** Pending  
**Version:** [VERSION].1  
**Dependencies:** Task 0  

### Description
[Detailed description of what needs to be done and why]

### Affected Files
- `path/to/file1`
- `path/to/file2`

### Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Verification Gates & Testing
- [ ] Static type check passes with 0 errors
- [ ] Unit / Integration tests pass
- [ ] [Verification check 1]
- [ ] [Verification check 2]

### Success Criteria
- [Criterion 1]
- [Criterion 2]

---

**End of Milestone [VERSION] Specification**
