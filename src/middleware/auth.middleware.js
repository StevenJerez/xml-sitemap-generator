import authService from '../services/auth.service.js';
import config from '../config/index.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide authentication credentials',
    });
  }

  if (config.auth.type === 'basic') {
    const credentials = authService.parseBasicAuth(authHeader);
    
    if (!credentials) {
      return res.status(401).json({
        error: 'Invalid authentication format',
        message: 'Expected Basic authentication',
      });
    }

    if (!authService.validateBasicAuth(credentials.username, credentials.password)) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
      });
    }

    req.user = { username: credentials.username };
    return next();
  }

  if (config.auth.type === 'jwt') {
    const token = authService.parseBearerToken(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Invalid authentication format',
        message: 'Expected Bearer token',
      });
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired',
      });
    }

    req.user = decoded;
    return next();
  }

  return res.status(500).json({
    error: 'Invalid authentication configuration',
  });
};
