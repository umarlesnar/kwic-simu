import jwt from 'jsonwebtoken';

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.NEXTAUTH_SECRET);
  } catch (error) {
    return null;
  }
};
