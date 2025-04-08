// settings.js

document.addEventListener('DOMContentLoaded', () => {

    const SETTINGS_STORAGE_KEY = 'generalAppSettings';
    const CURRENT_SETTINGS_VERSION = 4; // <-- Increment version

    // --- DOM References ---
    const monthYearInput = document.getElementById('setting-month-year');
    const teamDayInput = document.getElementById('team-day-input');
    const addTeamDayBtn = document.getElementById('add-team-day-btn');
    const teamDaysList = document.getElementById('team-days-list');
    const teamDayError = document.getElementById('team-day-error');
    const shiftLabelInput = document.getElementById('shift-label-input');
    const shiftStartTimeInput = document.getElementById('shift-start-time-input');
    const shiftEndTimeInput = document.getElementById('shift-end-time-input');
    const shiftPauseTimeInput = document.getElementById('shift-pause-time-input'); // New Ref
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const shiftTypesList = document.getElementById('shift-types-list');
    const shiftTypeError = document.getElementById('shift-type-error');
    const codeLabelInput = document.getElementById('code-label-input');
    const codeDescInput = document.getElementById('code-desc-input');
    const addCodeBtn = document.getElementById('add-code-btn');
    const codesList = document.getElementById('codes-list');
    const codeError = document.getElementById('code-error');


    // --- Default Data Definitions ---
    // Added default pause based on > 6h gross duration rule
    const defaultShiftTypes = [
        { label: "T1", start: "13:30", end: "19:30", pause: "00:00" }, // 6h gross -> 0 min pause default
        { label: "T2", start: "13:00", end: "19:00", pause: "00:00" }, // 6h gross -> 0 min pause default
        { label: "T4", start: "09:30", end: "20:00", pause: "00:30" }, // 10.5h gross -> 30 min pause
        { label: "T6", start: "12:30", end: "18:30", pause: "00:00" }, // 6h gross -> 0 min pause default
        { label: "N1", start: "14:30", end: "06:00", pause: "00:30" }, // 15.5h gross -> 30 min pause
        { label: "N5", start: "09:30", end: "06:00", pause: "00:30" }, // 20.5h gross -> 30 min pause (adjust if specific rules apply)
        { label: "N6", start: "13:15", end: "06:00", pause: "00:30" }, // 16.75h gross -> 30 min pause
        { label: "N7", start: "12:30", end: "06:00", pause: "00:30" }, // 17.5h gross -> 30 min pause
        { label: "F1", start: "06:00", end: "09:30", pause: "00:00" }, // 3.5h gross -> 0 min pause
        { label: "F3", start: "07:00", end: "14:30", pause: "00:30" }, // 7.5h gross -> 30 min pause
        { label: "Team", start: "08:00", end: "12:30", pause: "00:00" }, // 4.5h gross -> 0 min pause
    ];
    const defaultOtherCodes = [
        { label: "X", description: "Wunschfrei" }, { label: "U", description: "Urlaub" },
        { label: "ZWK", description: "Zeitwertkonto" }, { label: "-", description: "Dienstfrei" },
    ];

    // --- Helper Functions ---
    const formatDateForDisplay = (isoDate) => {
        if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) return '';
        const parts = isoDate.split('-');
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : '';
     };
    const clearError = (errorElement) => {
        if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; }
     };
    const showError = (errorElement, message) => {
        if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; }
     };

    // Helper to parse HH:MM to minutes
    const timeToMinutes = (timeString) => {
        if (!timeString || !timeString.includes(':')) return NaN;
        const [h, m] = timeString.split(':').map(n => parseInt(n, 10));
        if (isNaN(h) || isNaN(m)) return NaN;
        return h * 60 + m;
    };

    // Helper to format minutes to HH:MM
    const minutesToHHMM = (totalMinutes) => {
        if (isNaN(totalMinutes) || totalMinutes < 0) return "??:??";
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Calculates Gross Duration (handles overnight)
    const calculateGrossDurationMinutes = (startTime, endTime) => {
        const startMinutes = timeToMinutes(startTime);
        let endMinutes = timeToMinutes(endTime);

        if (isNaN(startMinutes) || isNaN(endMinutes)) return NaN;

        if (endMinutes <= startMinutes) { // Handle overnight
            endMinutes += 24 * 60;
        }
        return endMinutes - startMinutes;
    };

    // Calculates Net Work Time Minutes
    const calculateNetWorkMinutes = (startTime, endTime, pauseTime) => {
        const grossMinutes = calculateGrossDurationMinutes(startTime, endTime);
        const pauseMinutes = timeToMinutes(pauseTime);

        if (isNaN(grossMinutes) || isNaN(pauseMinutes)) return NaN;

        const netMinutes = grossMinutes - pauseMinutes;
        return netMinutes < 0 ? 0 : netMinutes; // Ensure net time is not negative
    };


    // --- Get Current State from DOM ---
    const getCurrentTeamDays = () => {
        return Array.from(teamDaysList.querySelectorAll('.list-item')).map(item => item.dataset.date);
     };
    // Include pause from dataset
    const getCurrentShiftTypes = () => {
        const items = shiftTypesList.querySelectorAll('.list-item');
        if (!items) return [];
        return Array.from(items)
            .map(item => ({
                label: item.dataset.label,
                start: item.dataset.start,
                end: item.dataset.end,
                pause: item.dataset.pause || "00:00" // Read pause, default if missing
            }));
     };
    const getCurrentOtherCodes = () => {
        const items = codesList.querySelectorAll('.list-item');
        if (!items) return [];
        return Array.from(items).map(item => ({ label: item.dataset.label, description: item.dataset.description }));
    };


    // --- Core Logic: Save and Load ---
    const saveSettings = () => {
        try {
            const settingsToSave = {
                version: CURRENT_SETTINGS_VERSION,
                monthYear: monthYearInput.value || null,
                teamDays: getCurrentTeamDays(),
                shiftTypes: getCurrentShiftTypes(), // Includes pause
                otherCodes: getCurrentOtherCodes()
            };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
            console.log(`Settings saved (Version ${CURRENT_SETTINGS_VERSION}):`, settingsToSave);
        } catch (error) {
            console.error("Error saving settings to localStorage:", error);
        }
    };

    const loadSettings = () => {
        const savedSettingsJSON = localStorage.getItem(SETTINGS_STORAGE_KEY);
        let settings = null;
        let forceDefaults = false;
        let loadedVersion = null;

        if (savedSettingsJSON) {
            try {
                settings = JSON.parse(savedSettingsJSON);
                loadedVersion = settings?.version;
            } catch (error) {
                console.error("Error parsing saved settings. Clearing and loading defaults.", error);
                settings = null; forceDefaults = true;
            }
        } else {
            forceDefaults = true;
        }

        if (settings && !forceDefaults) {
            if (loadedVersion !== CURRENT_SETTINGS_VERSION) {
                console.warn(`Saved version (${loadedVersion}) mismatch current (${CURRENT_SETTINGS_VERSION}). Loading defaults.`);
                forceDefaults = true; settings = null;
            } else {
                 console.log(`Saved version (${loadedVersion}) matches current.`);
            }
        }

        if (forceDefaults) {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
            teamDaysList.innerHTML = ''; shiftTypesList.innerHTML = ''; codesList.innerHTML = '';

            const now = new Date(); const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            monthYearInput.value = `${year}-${month}`;
            console.log("Setting default month/year.");

            console.log("Loading default shift types.");
            defaultShiftTypes.forEach(shift => renderShiftType(shift, false));

            console.log("Loading default other codes.");
            defaultOtherCodes.forEach(code => renderOtherCode(code, false));

            console.log("Saving initial default state with current version.");
            saveSettings();

        } else {
            console.log("Loading valid saved settings.");

            monthYearInput.value = settings.monthYear || (() => {
                const now = new Date(); const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                return `${year}-${month}`; })();

            teamDaysList.innerHTML = '';
            if (Array.isArray(settings.teamDays)) {
                settings.teamDays.forEach(date => renderTeamDay(date, false));
            }

            shiftTypesList.innerHTML = '';
            if (Array.isArray(settings.shiftTypes)) {
                settings.shiftTypes.forEach(shift => {
                    // Add fallback for pause if loading older data that didn't have it
                    const shiftData = { ...shift, pause: shift.pause || "00:00" };
                    renderShiftType(shiftData, false);
                });
            }

            codesList.innerHTML = '';
            if (Array.isArray(settings.otherCodes)) {
                settings.otherCodes.forEach(code => renderOtherCode(code, false));
            } else {
                 console.warn("Saved settings missing 'otherCodes', loading defaults for this section.");
                 defaultOtherCodes.forEach(code => renderOtherCode(code, false));
            }
        }
    };


    // --- Rendering Functions ---
    const renderTeamDay = (dateString, shouldSave = true) => {
        if (!dateString) return; const existingDates = getCurrentTeamDays();
        if (existingDates.includes(dateString)) { if (shouldSave) showError(teamDayError, "Datum existiert."); return; }
        if (shouldSave) clearError(teamDayError);
        const itemDiv = document.createElement('div'); itemDiv.className = 'list-item team-day-item';
        itemDiv.dataset.date = dateString; const textSpan = document.createElement('span');
        textSpan.textContent = `Team Tag: ${formatDateForDisplay(dateString)}`;
        const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'X'; removeBtn.title = "Entfernen";
        itemDiv.appendChild(textSpan); itemDiv.appendChild(removeBtn); teamDaysList.appendChild(itemDiv);
        if (shouldSave) saveSettings();
     };

    // MODIFIED: Handle pause, calculate net time, update display
    const renderShiftType = (shiftData, shouldSave = true) => {
        const { label, start, end, pause } = shiftData; // Destructure pause
        // Validate core data
        if (!label || typeof label !== 'string' || !start || !end || !pause) {
            console.warn("Invalid shift data:", shiftData); return;
        }

        const currentLabels = getCurrentShiftTypes().map(s => s.label.toLowerCase());
        const trimmedLabel = label.trim();

        if (currentLabels.includes(trimmedLabel.toLowerCase())) {
            if (shouldSave) { showError(shiftTypeError, `Typ "${trimmedLabel}" existiert bereits.`); }
            else { console.warn(`Duplicate shift label "${trimmedLabel}" during load.`); }
            return;
        }
        if (shouldSave) clearError(shiftTypeError);

        // Calculate Net Work Time for display
        const netWorkMinutes = calculateNetWorkMinutes(start, end, pause);
        const netWorkTimeString = minutesToHHMM(netWorkMinutes); // Format net time

        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item shift-type-item';
        itemDiv.dataset.label = trimmedLabel;
        itemDiv.dataset.start = start;
        itemDiv.dataset.end = end;
        itemDiv.dataset.pause = pause; // Store pause in dataset

        const textSpan = document.createElement('span');
        // Update text content format
        textSpan.textContent = `${trimmedLabel}: ${start} - ${end} (Arbeitszeit: ${netWorkTimeString} Pause: ${pause})`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button'; removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'X'; removeBtn.title = "Entfernen";
        itemDiv.appendChild(textSpan); itemDiv.appendChild(removeBtn);
        shiftTypesList.appendChild(itemDiv);

        if (shouldSave) {
            saveSettings();
        }
     };

    const renderOtherCode = (codeData, shouldSave = true) => {
        const { label, description } = codeData;
        if (!label || typeof label !== 'string' || !description || typeof description !== 'string') { console.warn("Invalid code data:", codeData); return; }
        const currentLabels = getCurrentOtherCodes().map(c => c.label.toLowerCase());
        const trimmedLabel = label.trim(); const trimmedDesc = description.trim();
        if (currentLabels.includes(trimmedLabel.toLowerCase())) {
            if (shouldSave) { showError(codeError, `Code "${trimmedLabel}" existiert bereits.`); }
            else { console.warn(`Duplicate code label "${trimmedLabel}" during load.`); }
            return;
        }
        if (shouldSave) clearError(codeError);
        const itemDiv = document.createElement('div'); itemDiv.className = 'list-item other-code-item';
        itemDiv.dataset.label = trimmedLabel; itemDiv.dataset.description = trimmedDesc;
        const textSpan = document.createElement('span');
        textSpan.textContent = `${trimmedLabel}: ${trimmedDesc}`;
        const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'X'; removeBtn.title = "Entfernen";
        itemDiv.appendChild(textSpan); itemDiv.appendChild(removeBtn); codesList.appendChild(itemDiv);
        if (shouldSave) saveSettings();
     };

    // --- Event Listeners ---
    monthYearInput.addEventListener('change', saveSettings);

    addTeamDayBtn.addEventListener('click', () => {
        const dateValue = teamDayInput.value; clearError(teamDayError);
        if (!dateValue) { showError(teamDayError, "Datum auswählen."); teamDayInput.focus(); return; }
        renderTeamDay(dateValue, true); teamDayInput.value = '';
     });

    // MODIFIED: Get pause value and pass to renderShiftType
    addShiftTypeBtn.addEventListener('click', () => {
        const label = shiftLabelInput.value.trim();
        const start = shiftStartTimeInput.value;
        const end = shiftEndTimeInput.value;
        const pause = shiftPauseTimeInput.value; // Get pause value
        clearError(shiftTypeError);

        if (!label) { showError(shiftTypeError, "Bezeichnung eingeben."); shiftLabelInput.focus(); return; }
        if (!start) { showError(shiftTypeError, "Startzeit eingeben."); shiftStartTimeInput.focus(); return; }
        if (!end) { showError(shiftTypeError, "Endzeit eingeben."); shiftEndTimeInput.focus(); return; }
        if (!pause) { showError(shiftTypeError, "Pause eingeben (ggf. 00:00)."); shiftPauseTimeInput.focus(); return; } // Validate pause

        // Pass pause to render function
        renderShiftType({ label, start, end, pause }, true);

        if (!shiftTypeError.textContent) {
            shiftLabelInput.value = ''; shiftStartTimeInput.value = ''; shiftEndTimeInput.value = '';
            shiftPauseTimeInput.value = '00:00'; // Reset pause input
        }
     });

    addCodeBtn.addEventListener('click', () => {
        const label = codeLabelInput.value.trim(); const description = codeDescInput.value.trim();
        clearError(codeError);
        if (!label) { showError(codeError, "Code eingeben."); codeLabelInput.focus(); return; }
        if (!description) { showError(codeError, "Bedeutung eingeben."); codeDescInput.focus(); return; }
        renderOtherCode({ label, description }, true);
        if (!codeError.textContent) { codeLabelInput.value = ''; codeDescInput.value = ''; }
     });

    const handleRemoveClick = (event) => {
        if (event.target.classList.contains('remove-item-btn')) {
            const itemToRemove = event.target.closest('.settings-list-area .list-item');
            if (itemToRemove) { itemToRemove.remove(); saveSettings(); }
        }
     };
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) { contentContainer.addEventListener('click', handleRemoveClick); }

    // --- Initial Load ---
    loadSettings();

}); // End DOMContentLoaded