document.addEventListener('DOMContentLoaded', () => {

    const SETTINGS_STORAGE_KEY = 'generalAppSettings';

    const monthYearInput = document.getElementById('setting-month-year');
    const teamDayInput = document.getElementById('team-day-input');
    const addTeamDayBtn = document.getElementById('add-team-day-btn');
    const teamDaysList = document.getElementById('team-days-list');
    const teamDayError = document.getElementById('team-day-error');
    const shiftLabelInput = document.getElementById('shift-label-input');
    const shiftStartTimeInput = document.getElementById('shift-start-time-input');
    const shiftEndTimeInput = document.getElementById('shift-end-time-input');
    const addShiftTypeBtn = document.getElementById('add-shift-type-btn');
    const shiftTypesList = document.getElementById('shift-types-list');
    const shiftTypeError = document.getElementById('shift-type-error');

    const formatDateForDisplay = (isoDate) => {
        if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) return '';
        const parts = isoDate.split('-');
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : '';
    };

    const clearError = (errorElement) => {
        if(errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    };

    const showError = (errorElement, message) => {
         if(errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
         }
    };

    const getCurrentTeamDays = () => {
        return Array.from(teamDaysList.querySelectorAll('.list-item'))
                    .map(item => item.dataset.date);
    };

    const getCurrentShiftTypes = () => {
        return Array.from(shiftTypesList.querySelectorAll('.list-item'))
                    .map(item => ({
                        label: item.dataset.label,
                        start: item.dataset.start,
                        end: item.dataset.end
                    }));
    };

    const saveSettings = () => {
        try {
            const settings = {
                monthYear: monthYearInput.value || null,
                teamDays: getCurrentTeamDays(),
                shiftTypes: getCurrentShiftTypes()
            };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
             console.log("Settings saved:", settings);
        } catch (error) {
            console.error("Error saving settings to localStorage:", error);
        }
    };

    const loadSettings = () => {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

        if (!savedSettings) {
            console.log("No saved settings found. Setting default month/year.");
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            monthYearInput.value = `${year}-${month}`;
            saveSettings();
            return;
        }

        try {
            const settings = JSON.parse(savedSettings);
            console.log("Loading settings:", settings);

            if (settings.monthYear) {
                monthYearInput.value = settings.monthYear;
            } else {
                 const now = new Date();
                 const year = now.getFullYear();
                 const month = (now.getMonth() + 1).toString().padStart(2, '0');
                 monthYearInput.value = `${year}-${month}`;
            }

            teamDaysList.innerHTML = '';
            if (Array.isArray(settings.teamDays)) {
                settings.teamDays.forEach(date => renderTeamDay(date, false));
            }

            shiftTypesList.innerHTML = '';
            if (Array.isArray(settings.shiftTypes)) {
                settings.shiftTypes.forEach(shift => renderShiftType(shift, false));
            }

        } catch (error) {
            console.error("Error parsing settings from localStorage:", error);
             const now = new Date();
             const year = now.getFullYear();
             const month = (now.getMonth() + 1).toString().padStart(2, '0');
             monthYearInput.value = `${year}-${month}`;
        }
    };

     const renderTeamDay = (dateString, shouldSave = true) => {
        if (!dateString) return;

        const existingDates = getCurrentTeamDays();
        if (existingDates.includes(dateString)) {
            showError(teamDayError, "Dieses Datum wurde bereits hinzugefügt.");
            return;
        }
        clearError(teamDayError);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item team-day-item';
        itemDiv.dataset.date = dateString;

        const textSpan = document.createElement('span');
        textSpan.textContent = `Team Tag: ${formatDateForDisplay(dateString)}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'X';
        removeBtn.title = "Entfernen";

        itemDiv.appendChild(textSpan);
        itemDiv.appendChild(removeBtn);
        teamDaysList.appendChild(itemDiv);

        if (shouldSave) {
            saveSettings();
        }
    };

    const renderShiftType = (shiftData, shouldSave = true) => {
        const { label, start, end } = shiftData;
        if (!label || !start || !end) return;

        const existingLabels = getCurrentShiftTypes().map(s => s.label.toLowerCase());
        if (existingLabels.includes(label.toLowerCase())) {
             showError(shiftTypeError, `Typ "${label}" existiert bereits.`);
             return;
        }
         clearError(shiftTypeError);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item shift-type-item';
        itemDiv.dataset.label = label;
        itemDiv.dataset.start = start;
        itemDiv.dataset.end = end;

        const textSpan = document.createElement('span');
        textSpan.textContent = `${label}: ${start} - ${end}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'X';
        removeBtn.title = "Entfernen";

        itemDiv.appendChild(textSpan);
        itemDiv.appendChild(removeBtn);
        shiftTypesList.appendChild(itemDiv);

        if (shouldSave) {
            saveSettings();
        }
    };

    monthYearInput.addEventListener('change', saveSettings);

    addTeamDayBtn.addEventListener('click', () => {
        const dateValue = teamDayInput.value;
        clearError(teamDayError);
        if (!dateValue) {
            showError(teamDayError, "Bitte wählen Sie ein Datum aus.");
            teamDayInput.focus();
            return;
        }
        renderTeamDay(dateValue);
        teamDayInput.value = '';
    });

    addShiftTypeBtn.addEventListener('click', () => {
        const label = shiftLabelInput.value.trim();
        const start = shiftStartTimeInput.value;
        const end = shiftEndTimeInput.value;
         clearError(shiftTypeError);

        if (!label) {
            showError(shiftTypeError, "Bitte Bezeichnung eingeben.");
            shiftLabelInput.focus();
            return;
        }
        if (!start) {
             showError(shiftTypeError, "Bitte Startzeit eingeben.");
            shiftStartTimeInput.focus();
            return;
        }
        if (!end) {
             showError(shiftTypeError, "Bitte Endzeit eingeben.");
             shiftEndTimeInput.focus();
            return;
        }

        renderShiftType({ label, start, end });

        shiftLabelInput.value = '';
        shiftStartTimeInput.value = '';
        shiftEndTimeInput.value = '';
    });

    const handleRemoveClick = (event, listElement) => {
         if (event.target.classList.contains('remove-item-btn')) {
            const itemToRemove = event.target.closest('.list-item');
            if (itemToRemove) {
                itemToRemove.remove();
                saveSettings();
            }
        }
    };

    teamDaysList.addEventListener('click', (e) => handleRemoveClick(e, teamDaysList));
    shiftTypesList.addEventListener('click', (e) => handleRemoveClick(e, shiftTypesList));

    loadSettings();

});