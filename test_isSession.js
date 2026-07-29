const rawAttendanceList = [
  { attendanceDate: '2026-06-18T00:00:00.000Z', subjectId: 'Web Technologies', periodId: '1' }
];
const selectedDate = '2026-06-18';
const selectedSubject = 'Software Engineering';
const selectedPeriod = 'Period 1 (09:00 - 10:00)';

const formattedDate = new Date(selectedDate);
formattedDate.setUTCHours(0, 0, 0, 0);
const isMarked = rawAttendanceList.some(r => {
  const rDate = new Date(r.attendanceDate || r.date);
  rDate.setUTCHours(0,0,0,0);
  return rDate.getTime() === formattedDate.getTime() && 
         (r.subjectId === selectedSubject || r.subject === selectedSubject) && 
         (r.periodId === selectedPeriod.split(' ')[1] || r.period === selectedPeriod.split(' ')[1]);
});
console.log('isMarked:', isMarked);

