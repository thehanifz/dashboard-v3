OverSee — Mobile UI Patch: Dashboard, Profile, As-Built

Changes:
- Responsive Dashboard KPI/chart layout for small screens.
- Responsive HBar: labels can occupy full width on mobile; bar moves to a second row.
- PTL summary chart receives the same mobile treatment.
- Profile uses compact mobile spacing and safe bottom padding for fixed navigation.
- As-Built Library/Generate switch from desktop split panes to a stacked mobile workspace; desktop stays split-pane.
- Topology and Template Fill generators use stacked form/preview panels on mobile.
- Main As-Built content spacing is adjusted for mobile bottom navigation.
- No backend/API/permission logic changes.

Validation:
- Source changes were reviewed statically.
- Full npm build could not be completed in the isolated environment because installing frontend dependencies timed out, so use the project's normal npm run build on the target server.
