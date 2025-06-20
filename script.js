document.addEventListener('DOMContentLoaded', () => {
    // ELEMENTOS DO DOM
    const monthYearStr = document.getElementById('month-year-str');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // ELEMENTOS DO MODAL
    const eventModal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('modal-title');
    const eventIdInput = document.getElementById('event-id');
    const eventTitleInput = document.getElementById('event-title-input'); // General title, now optional
    const eventDescInput = document.getElementById('event-desc-input');
    const saveEventBtn = document.getElementById('save-event-btn');
    const deleteEventBtn = document.getElementById('delete-event-btn');
    const closeBtn = document.querySelector('.close-btn');
    const eventHourInput = document.getElementById('event-hour-input');

    // NEW DOM ELEMENTS FOR EVENT TYPES AND CONDITIONAL INPUTS
    const eventTypeSelect = document.getElementById('event-type-select');
    const reuniaoOptionsDiv = document.getElementById('reuniao-options');
    const batismoMocidadeOptionsDiv = document.getElementById('batismo-mocidade-options');
    const ensaioRegionalOptionsDiv = document.getElementById('ensaio-regional-options');
    const ensaioLocalOptionsDiv = document.getElementById('ensaio-local-options');

    const ancientsNameInput = document.getElementById('ancients-name-input');
    const cityInputBM = document.getElementById('city-input-bm');
    const ancientsNameERInput = document.getElementById('ancients-name-er-input');
    const regionalManagerInput = document.getElementById('regional-manager-input');
    const cityInputER = document.getElementById('city-input-er');
    const localManagerInput = document.getElementById('local-manager-input');
    const cityInputEL = document.getElementById('city-input-el');

    // NEW CHECKBOXES
    const participantCheckboxes = document.querySelectorAll('input[name="event-participant"]');
    const reuniaoTypeCheckboxes = document.querySelectorAll('input[name="reuniao-type"]'); // For RMA, RRM, etc.

    // ESTADO DO CALENDÁRIO
    let currentDate = new Date();
    let db;
    let selectedDate;

    // INICIALIZAÇÃO DO INDEXEDDB
    function initDB() {
        const request = indexedDB.open('agendaDB', 1);

        request.onerror = (event) => console.error("Erro no IndexedDB:", event.target.errorCode);

        request.onsuccess = (event) => {
            db = event.target.result;
            renderCalendar();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('events', { keyPath: 'id' });
        };
    }

    // RENDERIZAÇÃO DO CALENDÁRIO
    async function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthYearStr.textContent = `${new Date(year, month).toLocaleString('pt-br', { month: 'long' })} ${year}`;
        calendarDays.innerHTML = '';

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const events = await getEventsForMonth(year, month);

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            calendarDays.appendChild(emptyDay);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const daySquare = document.createElement('div');
            daySquare.classList.add('day');
            daySquare.textContent = day;
            daySquare.dataset.date = new Date(year, month, day).toISOString().split('T')[0];

            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                daySquare.classList.add('today');
            }

            const dateStr = daySquare.dataset.date;
            if (events.some(e => e.id.startsWith(dateStr))) {
                const eventIndicator = document.createElement('div');
                eventIndicator.classList.add('event-indicator');
                daySquare.appendChild(eventIndicator);
            }

            daySquare.addEventListener('click', () => openModal(daySquare.dataset.date));
            calendarDays.appendChild(daySquare);
        }
    }

    function showConditionalInputs(eventType) {
        // Hide all conditional divs first
        reuniaoOptionsDiv.style.display = 'none';
        batismoMocidadeOptionsDiv.style.display = 'none';
        ensaioRegionalOptionsDiv.style.display = 'none';
        ensaioLocalOptionsDiv.style.display = 'none';
        eventTitleInput.style.display = 'none'; // Hide general title by default

        // Show specific divs based on event type
        if (eventType === 'Reunião') {
            reuniaoOptionsDiv.style.display = 'block';
        } else if (eventType === 'Batismo' || eventType === 'Reunião para Mocidade') {
            batismoMocidadeOptionsDiv.style.display = 'block';
        } else if (eventType === 'Ensaio Regional') {
            ensaioRegionalOptionsDiv.style.display = 'block';
        } else if (eventType === 'Ensaio Local') {
            ensaioLocalOptionsDiv.style.display = 'block';
        } else if (eventType === '') { // No event type selected or default
             eventTitleInput.style.display = 'block'; // Show general title input
        }
    }

    async function openModal(date) {
        selectedDate = date;
        resetModal(); // Reset modal first to clear previous state

        const events = await getEventsForDate(date);

        modalTitle.textContent = 'Adicionar Evento';
        eventTypeSelect.value = ''; // Ensure dropdown is reset
        showConditionalInputs(''); // Hide all conditional inputs initially

        const existingList = document.getElementById('event-list');
        if (existingList) existingList.remove();

        if (events.length > 0) {
            const list = document.createElement('ul');
            list.id = 'event-list';
            list.style.marginTop = '15px';

            events.forEach(event => {
                let eventDisplayTitle = event.title || event.eventType; // Use type if no specific title
                if (event.eventType === 'Reunião' && event.reuniaoTypes && event.reuniaoTypes.length > 0) {
                    eventDisplayTitle += ` (${event.reuniaoTypes.join(', ')})`;
                }
                const item = document.createElement('li');
                item.textContent = `${event.hour || '—'} - ${eventDisplayTitle}`;
                item.style.cursor = 'pointer';
                item.style.marginBottom = '5px';
                item.style.borderBottom = '1px solid #ccc';
                item.style.padding = '5px 0';

                item.addEventListener('click', () => {
                    eventIdInput.value = event.id;
                    eventTypeSelect.value = event.eventType || ''; // Set event type dropdown
                    eventTitleInput.value = event.title || ''; // General title

                    showConditionalInputs(event.eventType); // Show/hide inputs based on type

                    eventDescInput.value = event.description || '';
                    eventHourInput.value = event.hour || '';

                    // Populate specific inputs based on event type
                    if (event.eventType === 'Batismo' || event.eventType === 'Reunião para Mocidade') {
                        ancientsNameInput.value = event.ancientsName || '';
                        cityInputBM.value = event.city || '';
                    } else if (event.eventType === 'Ensaio Regional') {
                        ancientsNameERInput.value = event.ancientsName || '';
                        regionalManagerInput.value = event.regionalManager || '';
                        cityInputER.value = event.city || '';
                    } else if (event.eventType === 'Ensaio Local') {
                        localManagerInput.value = event.localManager || '';
                        cityInputEL.value = event.city || '';
                    }

                    // Mark participant checkboxes
                    participantCheckboxes.forEach(checkbox => {
                        checkbox.checked = event.participants && event.participants.includes(checkbox.value);
                    });

                    // Mark reuniao type checkboxes
                    reuniaoTypeCheckboxes.forEach(checkbox => {
                        checkbox.checked = event.reuniaoTypes && event.reuniaoTypes.includes(checkbox.value);
                    });

                    modalTitle.textContent = 'Editar Evento';
                    deleteEventBtn.style.display = 'inline-block';
                });

                list.appendChild(item);
            });

            document.querySelector('.modal-content').appendChild(list);
        }

        eventModal.style.display = 'flex';
    }

    function closeModal() {
        eventModal.style.display = 'none';
        resetModal();
    }

    function resetModal() {
        modalTitle.textContent = 'Adicionar Evento';
        eventIdInput.value = '';
        eventTitleInput.value = '';
        eventDescInput.value = '';
        eventHourInput.value = '';
        eventTypeSelect.value = ''; // Reset event type dropdown

        // Hide all conditional inputs
        showConditionalInputs('');

        // Clear all new input fields
        ancientsNameInput.value = '';
        cityInputBM.value = '';
        ancientsNameERInput.value = '';
        regionalManagerInput.value = '';
        cityInputER.value = '';
        localManagerInput.value = '';
        cityInputEL.value = '';

        // Desmarcar todos os checkboxes de participantes
        participantCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        // Desmarcar todos os checkboxes de tipo de reunião
        reuniaoTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        deleteEventBtn.style.display = 'none';
    }

    function saveEvent() {
        const eventType = eventTypeSelect.value;
        if (!eventType) {
            alert('Por favor, selecione o tipo de evento!');
            return;
        }

        let title = eventTitleInput.value.trim(); // General title, now optional
        const description = eventDescInput.value.trim();
        const eventId = eventIdInput.value || `${selectedDate}-${Date.now()}`;
        const hour = eventHourInput.value;

        // Collect new event-specific data
        let ancientsName = '';
        let city = '';
        let regionalManager = '';
        let localManager = '';
        const reuniaoTypes = [];

        if (eventType === 'Reunião') {
            Array.from(reuniaoTypeCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => reuniaoTypes.push(checkbox.value));
            title = reuniaoTypes.length > 0 ? `Reunião (${reuniaoTypes.join(', ')})` : 'Reunião';
        } else if (eventType === 'Batismo' || eventType === 'Reunião para Mocidade') {
            ancientsName = ancientsNameInput.value.trim();
            city = cityInputBM.value.trim();
            title = eventType; // Set title as event type
        } else if (eventType === 'Ensaio Regional') {
            ancientsName = ancientsNameERInput.value.trim();
            regionalManager = regionalManagerInput.value.trim();
            city = cityInputER.value.trim();
            title = eventType; // Set title as event type
        } else if (eventType === 'Ensaio Local') {
            localManager = localManagerInput.value.trim();
            city = cityInputEL.value.trim();
            title = eventType; // Set title as event type
        }

        // Coletar os participantes selecionados
        const selectedParticipants = Array.from(participantCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        const eventData = {
            id: eventId,
            eventType: eventType, // Store event type
            title: title, // Updated title based on type
            description: description,
            hour: hour,
            participants: selectedParticipants,
            // New fields based on event type
            ancientsName: ancientsName,
            city: city,
            regionalManager: regionalManager,
            localManager: localManager,
            reuniaoTypes: reuniaoTypes // Store selected reunion types
        };

        const transaction = db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        store.put(eventData);

        transaction.oncomplete = () => {
            closeModal();
            renderCalendar();
        };

        transaction.onerror = (event) => console.error("Erro ao salvar evento:", event.target.errorCode);
    }

    function deleteEvent() {
        const eventId = eventIdInput.value;
        if (!eventId) return;

        const transaction = db.transaction(['events'], 'readwrite');
        const store = transaction.objectStore('events');
        store.delete(eventId);

        transaction.oncomplete = () => {
            closeModal();
            renderCalendar();
        };

        transaction.onerror = (event) => console.error("Erro ao deletar evento:", event.target.errorCode);
    }

    async function getEventsForMonth(year, month) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            const request = store.getAll();

            request.onsuccess = () => {
                const allEvents = request.result;
                const monthEvents = allEvents.filter(e => e.id.startsWith(monthStr));
                resolve(monthEvents);
            };

            request.onerror = (event) => reject("Erro ao buscar eventos:", event.target.errorCode);
        });
    }

    async function getEventsForYear(year) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.getAll();

            request.onsuccess = () => {
                const allEvents = request.result;
                const yearEvents = allEvents.filter(e => e.id.startsWith(`${year}-`));
                resolve(yearEvents);
            };

            request.onerror = (event) => reject("Erro ao buscar eventos do ano:", event.target.errorCode);
        });
    }

    async function getEventsForDate(dateStr) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.getAll();

            request.onsuccess = () => {
                const allEvents = request.result;
                const dateEvents = allEvents.filter(e => e.id.startsWith(dateStr));
                resolve(dateEvents);
            };

            request.onerror = (event) => reject("Erro ao buscar eventos:", event.target.errorCode);
        });
    }

    async function exportToPDF() {
        // Initialize jsPDF in landscape mode
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); // Set orientation to landscape

        const year = currentDate.getFullYear();
        doc.setFontSize(20);
        doc.text(`Relatório Anual de Eventos - ${year}`, 14, 22);

        const events = await getEventsForYear(year);

        if (events.length === 0) {
            doc.setFontSize(12);
            doc.text("Nenhum evento agendado para este ano.", 14, 35);
        } else {
            // Ordena os eventos pela data e depois pela hora
            events.sort((a, b) => {
                const dateA = a.id.split('-').slice(0, 3).join('-');
                const dateB = b.id.split('-').slice(0, 3).join('-');

                if (dateA !== dateB) {
                    return new Date(dateA) - new Date(dateB);
                }
                const hourA = a.hour || '00:00';
                const hourB = b.hour || '00:00';
                return hourA.localeCompare(hourB);
            });

            const tableColumnTitles = ["Data", "Horário", "Tipo de Evento", "Cidade", "Detalhes", "Descrição", "Participantes"];
            const tableBody = events.map(event => {
                const datePart = event.id.split('-').slice(0, 3).join('-');
                const [y, m, d] = datePart.split('-');
                const formattedDate = `${d}/${m}/${y}`;

                let eventDetails = '';
                let city = event.city || ''; // Get city for the dedicated column

                if (event.eventType === 'Reunião' && event.reuniaoTypes && event.reuniaoTypes.length > 0) {
                    eventDetails = `Tipos: ${event.reuniaoTypes.join(', ')}`;
                } else if (event.eventType === 'Batismo' || event.eventType === 'Reunião para Mocidade') {
                    eventDetails = `Ancião: ${event.ancientsName || 'N/A'}`;
                } else if (event.eventType === 'Ensaio Regional') {
                    eventDetails = `Ancião: ${event.ancientsName || 'N/A'}\nEncarregado Regional: ${event.regionalManager || 'N/A'}`;
                } else if (event.eventType === 'Ensaio Local') {
                    eventDetails = `Encarregado Local: ${event.localManager || 'N/A'}`;
                } else if (event.title) {
                    eventDetails = `Título: ${event.title}`;
                } else {
                    eventDetails = 'N/A';
                }


                const participants = event.participants && event.participants.length > 0 ? event.participants.join(', ') : "Nenhum";

                return [
                    formattedDate,
                    event.hour || "—",
                    event.eventType,
                    city, // Dedicated city column
                    eventDetails,
                    event.description || "Sem descrição",
                    participants
                ];
            });

            doc.autoTable({
                head: [tableColumnTitles],
                body: tableBody,
                startY: 30,
                // Adjust column styles for better fit in landscape
                columnStyles: {
                    // Adjust column widths as needed for landscape
                    0: { cellWidth: 25 }, // Data
                    1: { cellWidth: 20 }, // Horário
                    2: { cellWidth: 40 }, // Tipo de Evento
                    3: { cellWidth: 30 }, // Cidade
                    4: { cellWidth: 50 }, // Detalhes (multiline)
                    5: { cellWidth: 'auto', minCellHeight: 15 }, // Descrição (auto width, min height for multiline)
                    6: { cellWidth: 'auto', minCellHeight: 15 }  // Participantes (auto width, min height for multiline)
                },
                didParseCell: function(data) {
                    // This callback helps format cell content before rendering
                    if (data.column.index === 4 && data.cell.raw) { // For 'Detalhes' column
                        data.cell.text = String(data.cell.raw).split('\n'); // Split by newline for multiline content
                    }
                }
            });
        }

        doc.save(`Relatorio_Anual_${year}.pdf`);
    }

    // EVENT LISTENERS
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == eventModal) closeModal();
    });

    saveEventBtn.addEventListener('click', saveEvent);
    deleteEventBtn.addEventListener('click', deleteEvent);
    exportPdfBtn.addEventListener('click', exportToPDF);

    // Event listener for the new event type dropdown
    eventTypeSelect.addEventListener('change', (event) => {
        showConditionalInputs(event.target.value);
    });


    // INICIALIZAÇÃO
    initDB();
});
