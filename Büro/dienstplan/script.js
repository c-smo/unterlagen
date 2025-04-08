const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => context.querySelectorAll(selector);

const formatDateForDisplay = (isoDate) => {
    if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) {
        return '';
    }
    const parts = isoDate.split('-');
    return parts.length === 3 ? `${parts[2]}.${parts[1]}` : '';
};

(() => {
    const themeToggleButton = $('#theme-toggle-btn');
    const htmlElement = document.documentElement;
    const THEME_STORAGE_KEY = 'theme';
    const DARK_THEME_CLASS = 'dark-theme';
    const LIGHT_THEME_CLASS = 'light-theme';
    const DEFAULT_THEME = 'dark';

    const updateThemeButton = (theme) => {
        const isDark = theme === 'dark';
        themeToggleButton.textContent = isDark ? '☀️' : '🌙';
        themeToggleButton.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    };

    const applyTheme = (theme) => {
        htmlElement.className = theme === 'dark' ? DARK_THEME_CLASS : LIGHT_THEME_CLASS;
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        if (themeToggleButton) {
             updateThemeButton(theme);
        }
    };

    themeToggleButton?.addEventListener('click', () => {
        const isCurrentlyDark = htmlElement.classList.contains(DARK_THEME_CLASS);
        applyTheme(isCurrentlyDark ? 'light' : 'dark');
    });

    const initialTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    applyTheme(initialTheme);
})();


document.addEventListener('DOMContentLoaded', () => {
    const editorForm = $('#json-editor-form');
    if (!editorForm) return;

    const nameInput = $('#name', editorForm);
    const stundenInput = $('#stunden', editorForm);
    const nachtdienstInput = $('#nachtdienst', editorForm);
    const exportBtn = $('#export-btn', editorForm);
    const loadJsonBtn = $('#load-json-btn', editorForm);
    const loadJsonInput = $('#load-json-input', editorForm);

    const arbeitstageButtons = Object.fromEntries(
        Array.from($$('.arbeitstag-btn', editorForm))
             .map(button => [button.dataset.day, button])
             .filter(([day]) => day)
    );

    const dateRangeSections = Array.from($$('.date-range-input-area', editorForm)).map(area => ({
        type: area.dataset.type,
        areaElement: area,
        vonInput: $('.date-von-input', area),
        bisInput: $('.date-bis-input', area),
        errorSpan: $('.date-error', area),
        addBtn: $('.add-item-btn', area),
        listArea: $(`#${area.dataset.type}-list-area`, editorForm)
    }));

    const clearDateValidation = (vonInput, bisInput, errorSpan) => {
        errorSpan.textContent = '';
        errorSpan.style.display = 'none';
        vonInput.classList.remove('invalid-date');
        bisInput?.classList.remove('invalid-date');
    }

    const checkDateOrder = (vonInput, bisInput, errorSpan) => {
        // Only check if both inputs have values
        if (!vonInput.value || !bisInput || !bisInput.value) {
            // If the specific error message about order was shown, clear it
            if (errorSpan.textContent === 'Enddatum muss am oder nach dem Startdatum liegen.') {
                 clearDateValidation(vonInput, bisInput, errorSpan);
            }
            return true; // Don't block if one date is missing yet
        }

        const vonDate = new Date(vonInput.value);
        const bisDate = new Date(bisInput.value);

        // Add time component check to avoid issues near midnight if Date objects are used
        // Setting hours to noon avoids timezone shifts causing day changes
        vonDate.setHours(12, 0, 0, 0);
        bisDate.setHours(12, 0, 0, 0);


        if (bisDate < vonDate) {
            errorSpan.textContent = 'Enddatum muss am oder nach dem Startdatum liegen.';
            errorSpan.style.display = 'block';
            // Only mark bisInput as invalid in this specific case initially
            bisInput.classList.add('invalid-date');
            vonInput.classList.remove('invalid-date'); // Von is valid, Bis is wrong relative to Von
            return false;
        }

        // If order is correct, clear the specific order error message
        if (errorSpan.textContent === 'Enddatum muss am oder nach dem Startdatum liegen.') {
            clearDateValidation(vonInput, bisInput, errorSpan); // Clears classes too
        }
        return true;
    };


    const validateDateInputsForAdd = (type, vonInput, bisInput, errorSpan) => {
        clearDateValidation(vonInput, bisInput, errorSpan);
        const vonValue = vonInput.value;
        const bisValue = bisInput?.value;
        let isValid = true;
        let errorMessage = '';
        let finalBisValue = bisValue;

        if (type === 'wunschfrei') {
            if (!vonValue) {
                isValid = false;
                errorMessage = 'Bitte Datum auswählen.';
                vonInput.classList.add('invalid-date');
            } else {
                // For wunschfrei, bis should logically be the same as von
                finalBisValue = vonValue;
            }
        } else {
            // For date ranges (ZWK, Urlaub)
            if (!vonValue || !bisValue) {
                isValid = false;
                errorMessage = 'Bitte beide Datumsfelder ausfüllen.';
                if (!vonValue) vonInput.classList.add('invalid-date');
                // Only mark bisInput invalid if it exists, isn't disabled, and is empty
                if (!bisValue && bisInput && !bisInput.disabled) bisInput.classList.add('invalid-date');
            } else if (!checkDateOrder(vonInput, bisInput, errorSpan)) {
                // checkDateOrder handles marking invalid and setting message
                isValid = false;
                // No need to set errorMessage here, checkDateOrder does it
            }
        }

        // Display error message if one was set and validation failed
        if (!isValid && errorMessage) {
            errorSpan.textContent = errorMessage;
            errorSpan.style.display = 'block';
        } else if (isValid) {
             // Ensure error message is hidden if valid
             errorSpan.textContent = '';
             errorSpan.style.display = 'none';
        }

        return { isValid, vonValue, bisValue: finalBisValue };
    };


    const createAddedDateItemElement = (type, vonValue, bisValue) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'added-date-item';
        itemDiv.dataset.von = vonValue;
        itemDiv.dataset.bis = bisValue; // Store bis value even if same as von for consistency

        const textSpan = document.createElement('span');
        const displayVon = formatDateForDisplay(vonValue);

        textSpan.textContent = (type === 'wunschfrei')
            ? `Am: ${displayVon}`
            : `${displayVon} bis ${formatDateForDisplay(bisValue)}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'Entfernen';
        removeBtn.addEventListener('click', () => itemDiv.remove());

        itemDiv.appendChild(textSpan);
        itemDiv.appendChild(removeBtn);
        return itemDiv;
    };

     const resetDateInputArea = (vonInput, bisInput, errorSpan) => {
        vonInput.value = '';
        // Clear validation state *before* potentially disabling bisInput
        clearDateValidation(vonInput, bisInput, errorSpan);
        if (bisInput) {
            bisInput.value = '';
            bisInput.disabled = true; // Re-disable bis input
            bisInput.removeAttribute('min');
            bisInput.classList.remove('invalid-date'); // Ensure invalid class is removed on reset
        }
        // Ensure vonInput invalid class is also removed on reset
        vonInput.classList.remove('invalid-date');
    };

    const handleAddDateItemClick = (event, section) => {
        const { type, vonInput, bisInput, errorSpan, listArea } = section;
        const { isValid, vonValue, bisValue } = validateDateInputsForAdd(type, vonInput, bisInput, errorSpan);

        if (!isValid) return;

        const newItemElement = createAddedDateItemElement(type, vonValue, bisValue);
        listArea.appendChild(newItemElement);
        resetDateInputArea(vonInput, bisInput, errorSpan);
    };

    const collectData = () => {
        const data = {
            Name: nameInput.value.trim() || "Unbenannt",
            Stunden: parseFloat(stundenInput.value) || 0,
            Nachtdienst: parseFloat(nachtdienstInput.value) || 0,
            Arbeitstage: {},
        };

        for (const day in arbeitstageButtons) {
            data.Arbeitstage[day] = arbeitstageButtons[day].classList.contains('active');
        }

        dateRangeSections.forEach(section => {
            const key = section.type.charAt(0).toUpperCase() + section.type.slice(1);
            const jsonKey = (key === 'Zwk') ? 'ZWK' : key;
            data[jsonKey] = [];

            $$('.added-date-item', section.listArea).forEach(item => {
                const { von, bis } = item.dataset;
                // Ensure both von and bis have values before pushing
                if (von && bis) {
                    data[jsonKey].push({ von, bis });
                } else if (von && section.type === 'wunschfrei') {
                    // Handle wunschfrei which might only have 'von' in older data structures if bis wasn't stored
                     data[jsonKey].push({ von, bis: von }); // Ensure bis is added
                } else {
                    console.warn(`Skipping item in ${jsonKey} due to missing von/bis:`, item.dataset);
                }
            });
        });

        return data;
    };

    const exportJson = () => {
        try {
            const data = collectData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';

            const filenameBase = data.Name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'mitarbeiter';
            a.download = `${filenameBase}_config.json`;
            a.href = url;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Fehler beim Exportieren der JSON:", error);
            alert("Fehler beim Exportieren der JSON: " + error.message);
        }
    };

    const populateForm = (data) => {
        if (!data || typeof data !== 'object') {
             alert("Ungültige JSON-Daten zum Laden.");
             return;
        }
        try {
            nameInput.value = data.Name || '';
            stundenInput.value = data.Stunden || 0;
            nachtdienstInput.value = data.Nachtdienst || 0;

            const arbeitstageData = data.Arbeitstage || {};
            for (const day in arbeitstageButtons) {
                 arbeitstageButtons[day].classList.toggle('active', !!arbeitstageData[day]);
            }

            dateRangeSections.forEach(section => {
                const key = section.type.charAt(0).toUpperCase() + section.type.slice(1);
                const jsonKey = (key === 'Zwk') ? 'ZWK' : key;
                const itemsData = data[jsonKey] || [];

                // Clear existing list items and reset input fields for the section
                section.listArea.innerHTML = '';
                resetDateInputArea(section.vonInput, section.bisInput, section.errorSpan);

                if (Array.isArray(itemsData)) {
                    itemsData.forEach(item => {
                        const vonValue = item?.von;
                        // Ensure bisValue exists, defaulting to vonValue if it's missing (e.g., wunschfrei or older data)
                        const bisValue = item?.bis || vonValue;

                        if (vonValue && bisValue) {
                             // Basic validation before adding
                            const vonDate = new Date(vonValue);
                            const bisDate = new Date(bisValue);
                             if (!isNaN(vonDate) && !isNaN(bisDate)) {
                                // Add check for date order only if it's not wunschfrei
                                const isOrderValid = (section.type === 'wunschfrei') || (bisDate >= vonDate);

                                if(isOrderValid) {
                                    const newItemElement = createAddedDateItemElement(section.type, vonValue, bisValue);
                                    section.listArea.appendChild(newItemElement);
                                } else {
                                     console.warn(`Ungültiger oder falsch geordneter Datumsbereich in JSON (${section.type}) übersprungen: Von ${vonValue}, Bis ${item?.bis}`);
                                }
                             } else {
                                 console.warn(`Ungültiges Datumformat in JSON (${section.type}) übersprungen:`, item);
                             }
                        } else {
                             console.warn(`Fehlender 'von' Wert in JSON (${section.type}) übersprungen:`, item);
                        }
                    });
                } else {
                     console.warn(`Daten für ${jsonKey} im JSON sind kein Array:`, itemsData);
                }
            });
        } catch (error) {
            console.error("Fehler beim Befüllen des Formulars:", error);
            alert("Fehler beim Laden der Daten in das Formular. JSON-Struktur prüfen.\n\nDetails: " + error.message);
        }
    };

    const handleFileLoad = (event) => {
        const file = event.target.files?.[0];
        const inputElement = event.target;

        if (!file) return;

        if (file.type !== "application/json") {
            alert("Bitte wählen Sie eine gültige .json Datei.");
            inputElement.value = null;
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                populateForm(jsonData);
            } catch (error) {
                console.error("Fehler beim Parsen der JSON:", error);
                alert("Fehler beim Parsen der JSON-Datei.\n\nDetails: " + error.message);
            } finally {
                // Reset file input so the same file can be loaded again if needed
                inputElement.value = null;
            }
        };

        reader.onerror = (e) => {
            console.error("Fehler beim Lesen der Datei:", e);
            alert("Fehler beim Lesen der Datei.");
            inputElement.value = null;
        };

        reader.readAsText(file);
    };

    // --- Event Listeners Setup ---

    exportBtn?.addEventListener('click', exportJson);
    loadJsonBtn?.addEventListener('click', () => loadJsonInput?.click());
    loadJsonInput?.addEventListener('change', handleFileLoad);

    // Arbeitstage Button Listeners
    for (const day in arbeitstageButtons) {
        arbeitstageButtons[day].addEventListener('click', (e) => {
            // Use currentTarget to ensure we're toggling the button the listener is attached to
            e.currentTarget.classList.toggle('active');
        });
    }

    // Date Range Section Listeners
    dateRangeSections.forEach(section => {
        const { type, vonInput, bisInput, errorSpan, addBtn } = section;

        // Add Button Listener
        addBtn?.addEventListener('click', (e) => handleAddDateItemClick(e, section));

        // Von Input Listener
        vonInput.addEventListener('input', () => {
            // Always clear validation on Von input change first
            clearDateValidation(vonInput, bisInput, errorSpan);

            // Handle logic for date ranges (ZWK, Urlaub)
            if (type !== 'wunschfrei' && bisInput) {
                if (vonInput.value) {
                    // Enable Bis input
                    bisInput.disabled = false;
                    // Set minimum allowed date for Bis input
                    bisInput.min = vonInput.value;

                    // --- ADDED BEHAVIOR ---
                    // Default Bis date to match Von date when Von changes
                    bisInput.value = vonInput.value;
                    // ---------------------

                    // Now, immediately check the order (it should be valid since they match)
                    // This also clears any previous order errors if bisInput had a value before
                    checkDateOrder(vonInput, bisInput, errorSpan);

                } else {
                    // If Von input is cleared, disable and clear Bis input
                    bisInput.disabled = true;
                    bisInput.value = '';
                    bisInput.removeAttribute('min');
                    // Ensure invalid class is removed if Von is cleared
                    bisInput.classList.remove('invalid-date');
                }
            } else if (type === 'wunschfrei') {
                 // For single date, just remove invalid class if it has a value
                 if (vonInput.value) {
                     vonInput.classList.remove('invalid-date');
                 }
            }
        });

        // Bis Input Listener (only if bisInput exists)
        if (bisInput) {
            bisInput.addEventListener('input', () => {
                 // Only validate order if Von input also has a value
                if (vonInput.value) {
                    // Check date order whenever Bis input changes
                    checkDateOrder(vonInput, bisInput, errorSpan);
                } else {
                     // If Von is empty, clear any validation on Bis change
                     clearDateValidation(vonInput, bisInput, errorSpan);
                }
            });
        }
    });

});