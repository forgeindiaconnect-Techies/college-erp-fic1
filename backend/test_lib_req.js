import axios from 'axios';

const testRequest = async () => {
  try {
    // get books
    const res1 = await axios.get('http://localhost:5000/api/library/books', {
      headers: { Authorization: 'Bearer mock-student-dynamic-ST2026010' }
    });
    const book = res1.data[0];
    console.log('Got book:', book.title, book._id);

    // request book
    const res2 = await axios.post('http://localhost:5000/api/library/request', {
      bookId: book._id
    }, {
      headers: { Authorization: 'Bearer mock-student-dynamic-ST2026010' }
    });
    console.log('Request successful:', res2.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

testRequest();
