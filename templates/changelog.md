#!/bin/bash

cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

---

## [v1.3] – May 2025

### Added
- **Export to CSV**: Users can now download the visible case table as a CSV file from the Case Management page.
- **Global Search Bar**: A new top-right search input allows users to filter all visible table rows across all columns in real time.
- **Column Picker (Field Selector)**: Users can show or hide columns using the cog icon, and their preferences are saved.
- **Column Sorting**: Users can sort the case table by clicking any column header (toggle between ascending and descending).

### Changed
- **Interface Simplification**: Removed row-based action buttons from the table; all case actions are now handled through the Edit Case modal (accessed by clicking DeepBlueRef).

---

## [v1.2] – April 2025

### Added
- **Clickable DeepBlueRef**: Clicking the case ID opens the Edit Case modal.
- **Saved Column Preferences**: User-selected column visibility is now saved across sessions using localStorage.
- **Reset View Button**: Users can reset their column layout to the default via the column picker panel.

### Changed
- **Removed VesselName Click**: Only DeepBlueRef is now used for opening the Edit Case modal.
- **Visual Cleanup**: Header buttons aligned for better layout; minor spacing and hover adjustments.

---

## [v1.1] – March 2025

*Initial deployment of the Case Management interface and modal editor.*

---
EOF

echo "✅ CHANGELOG.md created successfully."