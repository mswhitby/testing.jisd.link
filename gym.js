const GYM_API_URL = 'https://script.google.com/macros/s/AKfycbxFj5hfjmGJu7QUU4nTCgX3yZ68JfJpGKCfPahMJ0C9x3QlB9URMg_qjG6rrYyWAwe1UA/exec';

const studentIDInput = document.getElementById('studentID');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMessage = document.getElementById('lookupMessage');
const assignmentPanel = document.getElementById('assignmentPanel');
const morningCheckInBtn = document.getElementById('morningCheckInBtn');
const afterLunchCheckInBtn = document.getElementById('afterLunchCheckInBtn');
const newLookupBtn = document.getElementById('newLookupBtn');
const checkInMessage = document.getElementById('checkInMessage');
const checkInStatus = document.getElementById('checkInStatus');
const morningStatus = document.getElementById('morningStatus');
const afterLunchStatus = document.getElementById('afterLunchStatus');
const afterLunchStatusRow = document.getElementById('afterLunchStatusRow');
const lunchTimeMessage = document.getElementById('lunchTimeMessage');

let selectedStudent = null;
let selectedAssignment = null;
let attendanceStatus = null;

lookupBtn.addEventListener('click', lookupGymAssignment);
morningCheckInBtn.addEventListener('click', () => submitGymCheckIn('morning'));
afterLunchCheckInBtn.addEventListener('click', () => submitGymCheckIn('afterLunch'));
newLookupBtn.addEventListener('click', resetGymPage);
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
    attendanceStatus = await loadGymStatus();
    showAssignment();
  } catch (error) {
    showLookupMessage(error.message || 'Unable to load your assignment. Please try again.', 'error');
  } finally {
    setLookupLoading(false);
  }
}

async function loadGymStatus() {
  const params = new URLSearchParams({
    action: 'gymStatus',
    studentID: selectedStudent.studentId,
    testDate: selectedAssignment.testDate,
    github: 'true',
    _: Date.now().toString()
  });
  const response = await fetch(`${GYM_API_URL}?${params.toString()}`, {
    cache: 'no-store'
  });
  const result = await response.json();
  console.log('Gym attendance status response:', result);

  if (!result.success || result.code !== 'STATUS_FOUND' || !result.data) {
    throw new Error(result.message || 'Unable to load current check-in status.');
  }

  return result.data;
}

function showAssignment() {
  document.getElementById('studentName').textContent = selectedStudent.name;
  document.getElementById('studentIDDisplay').textContent = selectedStudent.studentId;
  document.getElementById('testName').textContent = selectedAssignment.testName;
  document.getElementById('testDate').textContent = selectedAssignment.displayDate || selectedAssignment.testDate;
  document.getElementById('testRoom').textContent = selectedAssignment.room;

  checkInMessage.classList.add('hidden');
  renderAttendanceStatus();
  assignmentPanel.classList.remove('hidden');
  setTimeout(() => assignmentPanel.classList.add('show'), 10);
  assignmentPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAttendanceStatus() {
  if (!attendanceStatus) return;

  const afterLunchIsOpen = attendanceStatus.activeSession === 'afterLunch';
  const morningTime = attendanceStatus.morningCheckIn;
  const afterLunchTime = attendanceStatus.afterLunchCheckIn;

  checkInStatus.classList.remove('hidden');
  morningStatus.textContent = morningTime
    ? `Checked in at ${morningTime}`
    : afterLunchIsOpen
      ? 'Not checked in'
      : 'Available';
  morningStatus.className = morningTime
    ? 'font-bold text-green-400'
    : 'font-bold text-gray-300';

  morningCheckInBtn.disabled = Boolean(morningTime) || afterLunchIsOpen;
  morningCheckInBtn.textContent = morningTime
    ? `Morning: ${morningTime}`
    : afterLunchIsOpen
      ? 'Morning Check-In Closed'
      : 'Morning Check-In';
  morningCheckInBtn.classList.toggle('opacity-50', morningCheckInBtn.disabled);
  morningCheckInBtn.classList.toggle('cursor-not-allowed', morningCheckInBtn.disabled);

  afterLunchCheckInBtn.classList.toggle('hidden', !afterLunchIsOpen);
  afterLunchStatusRow.classList.toggle('hidden', !afterLunchIsOpen);

  if (afterLunchIsOpen) {
    afterLunchStatus.textContent = afterLunchTime
      ? `Checked in at ${afterLunchTime}`
      : 'Available';
    afterLunchStatus.className = afterLunchTime
      ? 'font-bold text-green-400'
      : 'font-bold text-gray-300';
    afterLunchCheckInBtn.disabled = Boolean(afterLunchTime);
    afterLunchCheckInBtn.textContent = afterLunchTime
      ? `After Lunch: ${afterLunchTime}`
      : 'After Lunch Check-In';
    afterLunchCheckInBtn.classList.toggle('opacity-50', afterLunchCheckInBtn.disabled);
    afterLunchCheckInBtn.classList.toggle('cursor-not-allowed', afterLunchCheckInBtn.disabled);
  }

  lunchTimeMessage.textContent = afterLunchIsOpen
    ? `After-lunch check-in opened at ${attendanceStatus.lunchTime}.`
    : `After-lunch check-in opens at ${attendanceStatus.lunchTime}.`;
}

async function submitGymCheckIn(session) {
  if (!selectedStudent || !selectedAssignment || !attendanceStatus) return;

  setCheckInLoading(true, session);
  checkInMessage.classList.add('hidden');

  try {
    const params = new URLSearchParams({
      action: 'gymCheckIn',
      studentID: selectedStudent.studentId,
      testDate: selectedAssignment.testDate,
      session: session,
      github: 'true',
      _: Date.now().toString()
    });
    const response = await fetch(`${GYM_API_URL}?${params.toString()}`, {
      cache: 'no-store'
    });
    const result = await response.json();
    console.log('Gym check-in API response:', result);

    if (
      !result.success ||
      !['CHECKED_IN', 'ALREADY_CHECKED_IN'].includes(result.code)
    ) {
      throw new Error(result.message || 'Unable to complete your check-in.');
    }

    const statusField = session === 'morning'
      ? 'morningCheckIn'
      : 'afterLunchCheckIn';
    attendanceStatus[statusField] = result.data.checkInTime;
    renderAttendanceStatus();

    const sessionLabel = session === 'morning' ? 'Morning' : 'After lunch';
    checkInMessage.textContent = result.code === 'ALREADY_CHECKED_IN'
      ? `${sessionLabel} check-in was already recorded at ${result.data.checkInTime}.`
      : `${sessionLabel} check-in recorded at ${result.data.checkInTime}.`;
    checkInMessage.className = 'mt-4 text-green-400 text-center font-bold';
    checkInMessage.classList.remove('hidden');
  } catch (error) {
    console.error('Gym check-in failed:', error);
    checkInMessage.textContent = error.message || 'Unable to complete your check-in. Please ask a staff member for help.';
    checkInMessage.className = 'mt-4 text-red-400 text-center';
    checkInMessage.classList.remove('hidden');
  } finally {
    setCheckInLoading(false);
  }
}

function resetGymPage() {
  selectedStudent = null;
  selectedAssignment = null;
  attendanceStatus = null;
  studentIDInput.value = '';
  assignmentPanel.classList.add('hidden');
  assignmentPanel.classList.remove('show');
  checkInStatus.classList.add('hidden');
  afterLunchCheckInBtn.classList.add('hidden');
  afterLunchStatusRow.classList.add('hidden');
  hideLookupMessage();
  studentIDInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLookupLoading(isLoading) {
  lookupBtn.disabled = isLoading;
  lookupBtn.textContent = isLoading ? 'Searching...' : 'Find Assignment';
}

function setCheckInLoading(isLoading, session) {
  if (isLoading) {
    morningCheckInBtn.disabled = true;
    afterLunchCheckInBtn.disabled = true;
    if (session === 'morning') morningCheckInBtn.textContent = 'Checking In...';
    if (session === 'afterLunch') afterLunchCheckInBtn.textContent = 'Checking In...';
    return;
  }

  renderAttendanceStatus();
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
