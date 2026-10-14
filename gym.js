const GYM_API_URL = 'https://script.google.com/macros/s/AKfycbxFj5hfjmGJu7QUU4nTCgX3yZ68JfJpGKCfPahMJ0C9x3QlB9URMg_qjG6rrYyWAwe1UA/exec';

const studentIDInput = document.getElementById('studentID');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMessage = document.getElementById('lookupMessage');
const assignmentPanel = document.getElementById('assignmentPanel');
const successPanel = document.getElementById('successPanel');
const checkInBtn = document.getElementById('checkInBtn');
const newLookupBtn = document.getElementById('newLookupBtn');
const finishBtn = document.getElementById('finishBtn');
const checkInMessage = document.getElementById('checkInMessage');

let selectedStudent = null;
let selectedAssignment = null;

lookupBtn.addEventListener('click', lookupGymAssignment);
checkInBtn.addEventListener('click', submitGymCheckIn);
newLookupBtn.addEventListener('click', resetGymPage);
finishBtn.addEventListener('click', resetGymPage);
studentIDInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') lookupGymAssignment();
});

async function lookupGymAssignment() {
  const studentID = studentIDInput.value.trim();

  if (!studentID) {
    showLookupMessage('Please enter your Student ID number.', 'error');
    return;
  }

  setLookupLoading(true);
  hideLookupMessage();
  assignmentPanel.classList.add('hidden');
  assignmentPanel.classList.remove('show');
  successPanel.classList.add('hidden');
  successPanel.classList.remove('show');

  try {
    const url = `${GYM_API_URL}?github=true&studentID=${encodeURIComponent(studentID)}&_=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    const responseText = await response.text();

    if (!response.ok || !responseText.trim()) {
      throw new Error('Student was not found. Please check the Student ID and try again.');
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error('Student was not found. Please check the Student ID and try again.');
    }

    if (!result || !result.success || !result.data || !result.data.name) {
      throw new Error('Student was not found. Please check the Student ID and try again.');
    }

    const assignments = Array.isArray(result.data.assignments) ? result.data.assignments : [];

    if (assignments.length === 0) {
      throw new Error('No active testing assignment was found for that Student ID.');
    }

    const gymAssignments = assignments.filter(assignment =>
      String(assignment.room || '').toLowerCase().includes('gym')
    );

    if (gymAssignments.length === 0) {
      throw new Error('You do not have an active testing assignment in the gym.');
    }

    selectedStudent = result.data;
    selectedAssignment = gymAssignments[0];
    showAssignment();
  } catch (error) {
    showLookupMessage(error.message || 'Unable to load your assignment. Please try again.', 'error');
  } finally {
    setLookupLoading(false);
  }
}

function showAssignment() {
  document.getElementById('studentName').textContent = selectedStudent.name;
  document.getElementById('studentIDDisplay').textContent = selectedStudent.studentId;
  document.getElementById('testName').textContent = selectedAssignment.testName;
  document.getElementById('testDate').textContent = selectedAssignment.displayDate || selectedAssignment.testDate;
  document.getElementById('testRoom').textContent = selectedAssignment.room;

  checkInMessage.classList.add('hidden');
  assignmentPanel.classList.remove('hidden');
  setTimeout(() => assignmentPanel.classList.add('show'), 10);
  assignmentPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitGymCheckIn() {
  if (!selectedStudent || !selectedAssignment) return;

  checkInBtn.disabled = true;
  checkInBtn.textContent = 'Checking In...';
  checkInMessage.classList.add('hidden');

  const body = new URLSearchParams({
    action: 'gymCheckIn',
    studentID: selectedStudent.studentId,
    testDate: selectedAssignment.testDate,
    github: 'true'
  });

  try {
    const response = await fetch(GYM_API_URL, {
      method: 'POST',
      body: body
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Unable to complete your check-in.');
    }

    showSuccess(result);
  } catch (error) {
    checkInMessage.textContent = error.message || 'Unable to complete your check-in. Please ask a staff member for help.';
    checkInMessage.className = 'mt-4 text-red-400 text-center';
    checkInMessage.classList.remove('hidden');
  } finally {
    checkInBtn.disabled = false;
    checkInBtn.textContent = 'Check In';
  }
}

function showSuccess(result) {
  const data = result.data || {};
  assignmentPanel.classList.add('hidden');
  assignmentPanel.classList.remove('show');

  document.getElementById('successName').textContent = data.name || selectedStudent.name;
  document.getElementById('successDetails').textContent = `${data.testName || selectedAssignment.testName} · ${data.room || selectedAssignment.room}`;
  document.getElementById('successTime').textContent = result.code === 'ALREADY_CHECKED_IN'
    ? `Previously checked in at ${data.checkInTime}`
    : `Checked in at ${data.checkInTime}`;

  successPanel.classList.remove('hidden');
  setTimeout(() => successPanel.classList.add('show'), 10);
  successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetGymPage() {
  selectedStudent = null;
  selectedAssignment = null;
  studentIDInput.value = '';
  assignmentPanel.classList.add('hidden');
  assignmentPanel.classList.remove('show');
  successPanel.classList.add('hidden');
  successPanel.classList.remove('show');
  hideLookupMessage();
  studentIDInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLookupLoading(isLoading) {
  lookupBtn.disabled = isLoading;
  lookupBtn.textContent = isLoading ? 'Searching...' : 'Find Assignment';
}

function showLookupMessage(message, type) {
  lookupMessage.textContent = message;
  lookupMessage.className = type === 'error'
    ? 'mt-4 text-center text-red-600'
    : 'mt-4 text-center text-green-700';
}

function hideLookupMessage() {
  lookupMessage.classList.add('hidden');
  lookupMessage.textContent = '';
}
