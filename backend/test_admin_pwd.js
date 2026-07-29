import bcrypt from 'bcryptjs';

const hash = '$2b$10$qFMWJaogpi4nez.zAZdRpOy/R7RLUSygRZxxzWJ9cC3I/xgugoGJu';
bcrypt.compare('password123', hash).then(isMatch => {
  console.log('admin password match:', isMatch);
});
