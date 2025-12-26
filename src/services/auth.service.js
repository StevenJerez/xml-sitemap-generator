import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

class AuthService {
  constructor() {
    this.type = config.auth.type;
  }

  // Basic Auth validation
  validateBasicAuth(username, password) {
    return (
      username === config.auth.username &&
      password === config.auth.password
    );
  }

  // JWT token generation
  generateToken(username) {
    return jwt.sign(
      { username },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );
  }

  // JWT token verification
  verifyToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // Extract Basic Auth credentials from header
  parseBasicAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    return { username, password };
  }

  // Extract Bearer token from header
  parseBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.split(' ')[1];
  }
}

export default new AuthService();
