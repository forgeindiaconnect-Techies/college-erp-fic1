import axios from 'axios';

const testFull = async () => {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'savitha@gmail.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Logged in, got token:', token);

    // Get books
    const booksRes = await axios.get('http://localhost:5000/api/library/books', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const book = booksRes.data[0];
    console.log('Got book:', book.title);

    // Request book
    const reqRes = await axios.post('http://localhost:5000/api/library/request', { bookId: book._id }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Requested successfully:', reqRes.data);

  } catch (err) {
    console.error('Error in request:', err.response?.data || err.message);
  }
};

testFull();
