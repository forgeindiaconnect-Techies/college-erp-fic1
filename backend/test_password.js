import bcrypt from 'bcryptjs';

const hash = '$2b$10$AxgwSQU6xUYDv/1AHzjqEup8XZuNdIzX6dzjmsyj.V.IA02eRuUdq';
bcrypt.compare('password123', hash).then(isMatch => {
  console.log('agila password match:', isMatch);
});
