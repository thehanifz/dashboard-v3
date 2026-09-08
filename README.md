OverSee Mobile KPI + Free Drawing Patch

Changes:
- Compact 4-column KPI layout on normal mobile widths; 2x2 below 380px.
- Applied to Engineer and PTL dashboards.
- Mobile Free Drawing uses a compact quick toolbar, More tools sheet, Tools/Properties sheets, canvas-first layout, and two-finger pan/pinch zoom support.
- Mobile canvas auto-fits to the available viewport to avoid page-level horizontal scrolling.
- Desktop 3-panel Free Drawing layout remains available at lg and above.

Files included:
- frontend/src/components/asbuilt/FreeDrawing.tsx
- frontend/src/components/dashboard/SummaryDashboard.tsx
- frontend/src/components/dashboard/HBar.tsx
- frontend/src/components/ptl/PTLSummaryDashboard.tsx
- frontend/src/index.css

Validation note:
The build command was attempted in the isolated extraction environment but its Vite executable was not available there. Run `npm run build` in the project venv/environment on the deployment host.
