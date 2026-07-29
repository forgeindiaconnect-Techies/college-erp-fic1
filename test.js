fetch('http://localhost:5000/api/assignments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Test",
    subject: "Network Security",
    department: "Cyber Security",
    class: "Sem 6",
    dueDate: "2026-06-10",
    faculty: "Pavan",
    description: "Test description"
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
