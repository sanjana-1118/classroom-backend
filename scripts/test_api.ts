async function testSubjectCrud() {
  // Use an existing subject id (e.g., 4)
  const id = 4;
  console.log('--- Testing Subject CRUD ---');
  // Get current
  let res = await fetch(`http://127.0.0.1:8080/api/subjects/${id}`);
  let subject = await res.json();
  console.log('Original subject:', subject);

  // Update name
  const updatedName = (subject.data?.name ?? '') + ' Updated';
  res = await fetch(`http://127.0.0.1:8080/api/subjects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: updatedName }),
  });
  const updated = await res.json();
  console.log('Patch response:', updated);

  // Delete subject
  res = await fetch(`http://127.0.0.1:8080/api/subjects/${id}`, { method: 'DELETE' });
  const del = await res.json();
  console.log('Delete response:', del);
}

async function testClassCrud() {
  // Use an existing class id (e.g., 2)
  const id = 2;
  console.log('--- Testing Class CRUD ---');
  let res = await fetch(`http://127.0.0.1:8080/api/classes/${id}`);
  let cls = await res.json();
  console.log('Original class:', cls);

  const updatedName = (cls.data?.name ?? '') + ' Updated';
  res = await fetch(`http://127.0.0.1:8080/api/classes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: updatedName }),
  });
  const updated = await res.json();
  console.log('Patch response:', updated);

  res = await fetch(`http://127.0.0.1:8080/api/classes/${id}`, { method: 'DELETE' });
  const del = await res.json();
  console.log('Delete response:', del);
}

async function main() {
  await testSubjectCrud();
  await testClassCrud();
}

main();
