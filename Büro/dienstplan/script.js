// --- Theme Handling ---
const themeToggleButton = document.getElementById('theme-toggle-btn');
const currentHtml = document.documentElement; // Target <html> tag

// Function to apply theme and update button
const applyTheme = (theme) => {
    currentHtml.className = theme + '-theme'; // Set class on <html>
    localStorage.setItem('theme', theme); // Save preference

    if (themeToggleButton) { // Check if button exists on the page
        if (theme === 'dark') {
            themeToggleButton.textContent = '☀️'; // Or use an icon
             themeToggleButton.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            themeToggleButton.textContent = '🌙'; // Or use an icon
             themeToggleButton.setAttribute('aria-label', 'Switch to Dark Mode');
        }
    }
};

// Event listener for the toggle button
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
        const newTheme = currentHtml.classList.contains('dark-theme') ? 'light' : 'dark';
        applyTheme(newTheme);
    });
}

// Apply initial theme
const initialTheme = localStorage.getItem('theme') || 'dark';
applyTheme(initialTheme);


// --- Editor Form Logic (Needs to run after DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
    const editorForm = document.getElementById('json-editor-form');

    if (editorForm) {
        // --- Element References ---
        const nameInput = document.getElementById('name');
        const stundenInput = document.getElementById('stunden');
        const nachtdienstInput = document.getElementById('nachtdienst');
        const exportBtn = document.getElementById('export-btn');
        const arbeitstageButtons = {};
        editorForm.querySelectorAll('.arbeitstag-btn').forEach(button => {
            const day = button.dataset.day;
            if (day) arbeitstageButtons[day] = button;
        });
        // Removed "abwesenheiten"
        const dateRangeListIds = ['zwk', 'urlaub', 'wunschfrei'];
        const loadJsonBtn = document.getElementById('load-json-btn');
        const loadJsonInput = document.getElementById('load-json-input');

        // --- Date Range Validation and Handling ---

        // Helper function to format YYYY-MM-DD to DD.MM
        const formatDateForDisplay = (isoDate) => {
            if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) {
                return ''; // Return empty if format is wrong
            }
            const parts = isoDate.split('-'); // [YYYY, MM, DD]
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}`; // DD.MM
            }
            return ''; // Fallback
        };

        // Function to check date order (only for ranges with two inputs)
        const checkDateOrder = (vonInput, bisInput, errorSpan) => {
             const vonValue = vonInput.value;
             const bisValue = bisInput.value;
             let isValid = true;

             if(vonValue && bisValue) {
                 const vonDate = new Date(vonValue);
                const bisDate = new Date(bisValue);

                if (bisDate < vonDate) {
                    errorSpan.textContent = 'Enddatum muss am oder nach dem Startdatum liegen.';
                    errorSpan.style.display = 'block';
                    vonInput.classList.add('invalid-date');
                    bisInput.classList.add('invalid-date');
                    isValid = false;
                } else {
                     if (errorSpan.textContent === 'Enddatum muss am oder nach dem Startdatum liegen.') {
                         errorSpan.textContent = '';
                         errorSpan.style.display = 'none';
                     }
                     vonInput.classList.remove('invalid-date');
                     bisInput.classList.remove('invalid-date');
                }
             } else {
                 if (errorSpan.textContent === 'Enddatum muss am oder nach dem Startdatum liegen.') {
                     errorSpan.textContent = '';
                     errorSpan.style.display = 'none';
                 }
                  vonInput.classList.remove('invalid-date');
                  // Only remove bis invalid if bisInput exists
                  if(bisInput) bisInput.classList.remove('invalid-date');
             }
             return isValid;
        }

        // Creates the HTML element for an added date item
        // Now accepts 'type' to handle display formatting
        const createAddedDateItemElement = (type, vonValue, bisValue) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'added-date-item';
            // Store original ISO data in dataset for export
            // For Wunschfrei, bisValue will be the same as vonValue
            itemDiv.dataset.von = vonValue;
            itemDiv.dataset.bis = bisValue;

            const textSpan = document.createElement('span');
            const displayVon = formatDateForDisplay(vonValue);

            // Format the display text based on type
            if (type === 'wunschfrei') {
                textSpan.textContent = `Am: ${displayVon}`;
            } else {
                const displayBis = formatDateForDisplay(bisValue);
                textSpan.textContent = `${displayVon} bis ${displayBis}`;
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-item-btn';
            removeBtn.textContent = 'Entfernen';
            removeBtn.addEventListener('click', () => {
                itemDiv.remove();
            });

            itemDiv.appendChild(textSpan);
            itemDiv.appendChild(removeBtn);
            return itemDiv;
        };

        // Handles clicks on the "Hinzufügen" button
        const handleAddDateItemClick = (event) => {
            const inputArea = event.target.closest('.date-range-input-area');
            if (!inputArea) return;

            const type = inputArea.dataset.type;
            const listArea = document.getElementById(`${type}-list-area`);
            const vonInput = inputArea.querySelector('.date-von-input');
            const bisInput = inputArea.querySelector('.date-bis-input'); // Might be null for wunschfrei
            const errorSpan = inputArea.querySelector('.date-error');
            const vonValue = vonInput.value;
            let bisValue = bisInput ? bisInput.value : null; // Get bis value only if input exists

            // Clear previous errors first
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
            vonInput.classList.remove('invalid-date');
            if(bisInput) bisInput.classList.remove('invalid-date');

            // --- Validation on Submit ---
            let isValid = true;
            let errorMessage = '';

            if (type === 'wunschfrei') {
                // 1a. Check if single field is filled for Wunschfrei
                if (!vonValue) {
                    isValid = false;
                    errorMessage = 'Bitte Datum auswählen.';
                    vonInput.classList.add('invalid-date');
                }
                // If valid, set bisValue same as vonValue for internal processing
                if(isValid) bisValue = vonValue;
            } else {
                // 1b. Check if both fields are filled for other types
                if (!vonValue || !bisValue) {
                    isValid = false;
                    errorMessage = 'Bitte beide Datumsfelder ausfüllen.';
                     if (!vonValue) vonInput.classList.add('invalid-date');
                     if (!bisValue && bisInput && !bisInput.disabled) bisInput.classList.add('invalid-date'); // Check disabled status
                }
                // 2. Check date order only if both fields were initially filled
                else if (!checkDateOrder(vonInput, bisInput, errorSpan)) {
                     isValid = false;
                     // Error message already set by checkDateOrder
                }
            }

            // Show validation error message if any check failed
            if (!isValid) {
                 if(errorMessage) { // Only show general message if set
                    errorSpan.textContent = errorMessage;
                    errorSpan.style.display = 'block';
                 }
                return; // Stop processing
            }

            // --- If Valid ---
            // Create the new list item element (passes type now)
            const newItemElement = createAddedDateItemElement(type, vonValue, bisValue);
            listArea.appendChild(newItemElement);

            // Clear the input fields and disable 'Bis' where applicable
            vonInput.value = '';
            if (bisInput) { // Only interact with bisInput if it exists
                bisInput.value = '';
                bisInput.disabled = true;
                bisInput.removeAttribute('min');
                bisInput.classList.remove('invalid-date');
            }
            vonInput.classList.remove('invalid-date');
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
        };

        // --- Core Data Functions ---

        const collectData = () => {
            const data = {};
            data.Name = nameInput.value || "Unbenannt";
            data.Stunden = parseFloat(stundenInput.value) || 0;
            data.Nachtdienst = parseFloat(nachtdienstInput.value) || 0;
            data.Arbeitstage = {};
            for (const day in arbeitstageButtons) {
                 if (arbeitstageButtons[day]) {
                     data.Arbeitstage[day] = arbeitstageButtons[day].classList.contains('active');
                 }
            }

            // Collect data from added items, using dataset (ISO format)
            dateRangeListIds.forEach(type => {
                const key = type.charAt(0).toUpperCase() + type.slice(1);
                // Handle ZWK key separately if needed (e.g., ensure uppercase)
                const jsonKey = (key === 'Zwk') ? 'ZWK' : key;
                data[jsonKey] = []; // Start with an empty array

                const listArea = document.getElementById(`${type}-list-area`);
                if (listArea) {
                    const addedItems = listArea.querySelectorAll('.added-date-item');
                    addedItems.forEach(item => {
                        const vonValue = item.dataset.von;
                        // For Wunschfrei, bisValue in dataset was set same as vonValue
                        const bisValue = item.dataset.bis;
                        if (vonValue && bisValue) {
                            data[jsonKey].push({
                                von: vonValue, // Export ISO format
                                bis: bisValue  // Export ISO format
                            });
                        }
                    });
                }
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
                a.href = url;
                const filename = (data.Name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'mitarbeiter') + '_config.json';
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                alert("Fehler beim Exportieren der JSON: " + error.message);
            }
        }

        const populateForm = (data) => {
            try {
                // Basic Info
                nameInput.value = data.Name || '';
                stundenInput.value = data.Stunden || 0;
                nachtdienstInput.value = data.Nachtdienst || 0;

                // Arbeitstage Buttons
                if (data.Arbeitstage && typeof data.Arbeitstage === 'object') {
                    for (const day in arbeitstageButtons) {
                        if (arbeitstageButtons[day]) {
                            const isActive = data.Arbeitstage.hasOwnProperty(day) ? data.Arbeitstage[day] : false;
                            arbeitstageButtons[day].classList.toggle('active', isActive);
                        }
                    }
                } else {
                     for (const day in arbeitstageButtons) {
                         if (arbeitstageButtons[day]) arbeitstageButtons[day].classList.remove('active');
                     }
                }

                // Date Ranges - Populate LIST AREA, reset input area
                dateRangeListIds.forEach(type => {
                    const key = type.charAt(0).toUpperCase() + type.slice(1);
                    const jsonKey = (key === 'Zwk') ? 'ZWK' : key;
                    const listArea = document.getElementById(`${type}-list-area`);
                    const inputArea = editorForm.querySelector(`.date-range-input-area[data-type="${type}"]`);

                    // Clear existing list items and reset input fields
                    if (listArea) listArea.innerHTML = '';
                    if (inputArea) {
                         const vonInput = inputArea.querySelector('.date-von-input');
                         const bisInput = inputArea.querySelector('.date-bis-input'); // Might be null
                         const errorSpan = inputArea.querySelector('.date-error');

                         vonInput.value = '';
                         if(bisInput) { // Only reset bis if it exists
                             bisInput.value = '';
                             bisInput.disabled = true;
                             bisInput.removeAttribute('min');
                             bisInput.classList.remove('invalid-date');
                         }
                         errorSpan.style.display = 'none';
                         vonInput.classList.remove('invalid-date');
                    }

                    // Add items from JSON to the list area
                    if (data[jsonKey] && Array.isArray(data[jsonKey]) && listArea) {
                        data[jsonKey].forEach(item => {
                             const vonValue = item.von || '';
                             // Use vonValue for bisValue if type is wunschfrei, otherwise use item.bis
                             const bisValue = (type === 'wunschfrei') ? vonValue : (item.bis || '');

                            if (vonValue && bisValue) { // Ensure both (even if same) are present
                                 const vonDate = new Date(vonValue);
                                 const bisDate = new Date(bisValue);
                                 // Basic validity/order check before adding
                                 if (!isNaN(vonDate) && !isNaN(bisDate) && bisDate >= vonDate) {
                                    // Create element with type for correct display formatting
                                    const newItemElement = createAddedDateItemElement(type, vonValue, bisValue);
                                    listArea.appendChild(newItemElement);
                                 } else {
                                     console.warn(`Skipping invalid/malformed date range from JSON (${type}): Von ${vonValue} Bis ${item.bis}`); // Log original bis from json
                                 }
                            }
                        });
                    }
                });
            } catch (error) {
                console.error("Error populating form:", error);
                alert("Fehler beim Laden der Daten in das Formular. JSON-Struktur prüfen.\n\nDetails: " + error.message);
            }
        }

        const handleFileLoad = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (file.type !== "application/json") {
                alert("Bitte wählen Sie eine gültige .json Datei.");
                event.target.value = null;
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    populateForm(jsonData);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Fehler beim Parsen der JSON-Datei.\n\nDetails: " + error.message);
                } finally {
                    event.target.value = null;
                }
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
                alert("Fehler beim Lesen der Datei.");
                event.target.value = null;
            };
            reader.readAsText(file);
        }

        // --- Event Listeners ---
        if (exportBtn) exportBtn.addEventListener('click', exportJson);
        if (loadJsonBtn) loadJsonBtn.addEventListener('click', () => { if (loadJsonInput) loadJsonInput.click(); });
        if (loadJsonInput) loadJsonInput.addEventListener('change', handleFileLoad);

        // Arbeitstag button listeners
        for (const day in arbeitstageButtons) {
            if(arbeitstageButtons[day]) {
                arbeitstageButtons[day].addEventListener('click', (e) => e.currentTarget.classList.toggle('active'));
            }
        }

        // Add listeners to all "Hinzufügen" buttons in date range input areas
        editorForm.querySelectorAll('.add-item-btn').forEach(button => {
            button.addEventListener('click', handleAddDateItemClick);
        });

         // Add listeners to date inputs for enabling/disabling and live validation
         editorForm.querySelectorAll('.date-range-input-area').forEach(inputArea => {
             const vonInput = inputArea.querySelector('.date-von-input');
             const bisInput = inputArea.querySelector('.date-bis-input'); // Might be null
             const errorSpan = inputArea.querySelector('.date-error');
             const type = inputArea.dataset.type;

            // Listener for the 'Von' input
             vonInput.addEventListener('input', () => {
                 const vonValue = vonInput.value;

                 // Specific logic for date ranges (not single date like Wunschfrei)
                 if (type !== 'wunschfrei' && bisInput) {
                     if (vonValue) {
                         bisInput.disabled = false;
                         if (!bisInput.value) {
                            bisInput.value = vonValue;
                         }
                         bisInput.min = vonValue;
                         checkDateOrder(vonInput, bisInput, errorSpan); // Check order immediately
                     } else {
                         bisInput.disabled = true;
                         bisInput.value = '';
                         bisInput.removeAttribute('min');
                         // Clear errors related to 'Bis' if 'Von' is cleared
                         if (errorSpan.textContent.includes('Enddatum') || errorSpan.textContent.includes('beide')) {
                            errorSpan.textContent = '';
                            errorSpan.style.display = 'none';
                         }
                         vonInput.classList.remove('invalid-date');
                         bisInput.classList.remove('invalid-date');
                     }
                 } else if (type === 'wunschfrei') {
                     // For single date, just clear errors if input is cleared
                     if (!vonValue) {
                         errorSpan.textContent = '';
                         errorSpan.style.display = 'none';
                         vonInput.classList.remove('invalid-date');
                     } else {
                         // Clear potential "Bitte Datum auswählen" error if user starts typing
                         if (errorSpan.textContent === 'Bitte Datum auswählen.') {
                             errorSpan.textContent = '';
                             errorSpan.style.display = 'none';
                             vonInput.classList.remove('invalid-date');
                         }
                     }
                 }
             });

             // Listener for the 'Bis' input (only if it exists)
             if (bisInput) {
                 bisInput.addEventListener('change', () => {
                    checkDateOrder(vonInput, bisInput, errorSpan);
                 });
             }
         });


    } // End of check for editorForm

}); // End of DOMContentLoaded