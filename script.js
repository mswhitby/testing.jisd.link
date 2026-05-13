const APPS_SCRIPT_URL = 'https://us-central1-hall-pass-app-d6541.cloudfunctions.net/get_student_rooms_http';

const searchBtn = document.getElementById('searchBtn');
const newSearchBtn = document.getElementById('newSearchBtn');
const classroomCodeInput = document.getElementById('classroomCode');
const resultCard = document.getElementById('resultCard');
const errorMessage = document.getElementById('errorMessage');
const loadingMessage = document.getElementById('loadingMessage');
const mainTitle = document.getElementById('mainTitle');
const easterEgg = document.getElementById('easterEgg');
const closeEasterEgg = document.getElementById('closeEasterEgg');
const resultTableBody = document.getElementById('resultTableBody');
const mobileCards = document.getElementById('mobileCards');
const tableHead = document.getElementById('tableHead');
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeInfoModal = document.getElementById('closeInfoModal');

// ── Info Modal ──────────────────────────────────────────
infoBtn.addEventListener('click', () => {
  infoModal.style.display = 'flex';
});
closeInfoModal.addEventListener('click', () => {
  infoModal.style.display = 'none';
});
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) infoModal.style.display = 'none';
});

// ── Easter egg ──────────────────────────────────────────
let clickCount = 0;
mainTitle.addEventListener('click', function () {
  clickCount++;
  if (clickCount >= 5) {
    easterEgg.style.display = 'flex';
    clickCount = 0;
  }
});
closeEasterEgg.addEventListener('click', function () {
  easterEgg.style.display = 'none';
});

// ── Time formatting ─────────────────────────────────────
function formatTime(minutes, useShort) {
  if (minutes === null || minutes === undefined) return '';
  const h24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  if (useShort) {
    // e.g. "8 AM" or "12 PM"
    return `${h12} ${ampm}`;
  } else {
    // e.g. "8:00 AM" or "12:30 PM"
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
  }
}

// ── Search ──────────────────────────────────────────────
searchBtn.addEventListener('click', function () {
  const studentID = classroomCodeInput.value.trim();
  if (studentID === '') {
    showError('Please enter your StudentID number');
    return;
  }
  hideMessages();
  showLoading();
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';

  fetch(`${APPS_SCRIPT_URL}?studentID=${encodeURIComponent(studentID)}`)
    .then(res => res.json())
    .then(result => {
      if (!result.success) {
        if (result.error === 'Student ID not found') {
          onFailure('Student ID not found. Please check your number and try again.');
        } else if (result.error === 'No upcoming tests found') {
          onFailure('No upcoming test assignments found for your Student ID.');
        } else {
          onFailure(result.error);
        }
        return;
      }
      const data = result.data;
      onSuccess({
        studentName: data.name,
        studentID: data.studentId,
        assignments: data.assignments
      });
    })
    .catch(err => onFailure(err));
});

function onSuccess(data) {
  hideMessages();
  searchBtn.disabled = false;
  searchBtn.textContent = 'Find Room';

  if (!data || !data.studentName || !data.assignments || data.assignments.length === 0) {
    showError('No upcoming test assignments found for your Student ID.');
    return;
  }

  // Clear previous results
  resultTableBody.innerHTML = '';
  mobileCards.innerHTML = '';

  document.getElementById('studentName').textContent = data.studentName;
  document.getElementById('StudentIDValue').textContent = data.studentID;

  // Determine if any assignment has a time
  const hasAnyTime = data.assignments.some(a => a.timeMinutes !== null && a.timeMinutes !== undefined);

  // Determine if all times are on the hour (for short vs long format)
  const useShortTime = hasAnyTime && data.assignments
    .filter(a => a.timeMinutes !== null && a.timeMinutes !== undefined)
    .every(a => a.timeMinutes % 60 === 0);

  // Update desktop table header
  tableHead.innerHTML = `
    <tr>
      <th class="table-header px-4 py-3 rounded-tl-lg">Date</th>
      <th class="table-header px-4 py-3">Activity</th>
      ${hasAnyTime ? '<th class="table-header px-4 py-3">Time</th>' : ''}
      <th class="table-header px-4 py-3 rounded-tr-lg">Room</th>
    </tr>
  `;

  data.assignments.forEach(assignment => {
    const date = assignment.displayDate || assignment.testDate;
    const activity = assignment.test;
    const room = assignment.room;
    const timeStr = hasAnyTime ? formatTime(assignment.timeMinutes, useShortTime) : '';

    // Desktop table row
    const row = document.createElement('tr');
    row.className = 'table-row';
    row.innerHTML = `
      <td class="px-4 py-3 text-gray-300 border-t border-gray-800">${date}</td>
      <td class="px-4 py-3 text-gray-300 border-t border-gray-800">${activity}</td>
      ${hasAnyTime ? `<td class="px-4 py-3 text-gray-300 border-t border-gray-800">${timeStr}</td>` : ''}
      <td class="px-4 py-3 text-gray-300 border-t border-gray-800">${room}</td>
    `;
    resultTableBody.appendChild(row);

    // Mobile card
    const card = document.createElement('div');
    card.className = 'assignment-card';
    card.innerHTML = `
      <div class="card-date">${date}</div>
      <div class="card-activity">${activity}</div>
      <div class="card-meta">
        ${timeStr ? `<span class="card-time">${timeStr}</span>` : ''}
        <span class="card-room">Room ${room}</span>
      </div>
    `;
    mobileCards.appendChild(card);
  });

  resultCard.classList.remove('hidden');
  setTimeout(() => resultCard.classList.add('show'), 10);
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onFailure(error) {
  hideMessages();
  searchBtn.disabled = false;
  searchBtn.textContent = 'Find Room';
  console.error('Error:', error);
  showError(typeof error === 'string' ? error : 'An error occurred while searching. Please try again.');
}

newSearchBtn.addEventListener('click', function () {
  resultCard.classList.remove('show');
  setTimeout(() => {
    resultCard.classList.add('hidden');
    resultTableBody.innerHTML = '';
    mobileCards.innerHTML = '';
    classroomCodeInput.value = '';
    classroomCodeInput.focus();
    hideMessages();
  }, 300);
});

function showError(message) {
  hideMessages();
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function showLoading() {
  hideMessages();
  loadingMessage.classList.remove('hidden');
}

function hideMessages() {
  errorMessage.classList.add('hidden');
  loadingMessage.classList.add('hidden');
}

classroomCodeInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') searchBtn.click();
});