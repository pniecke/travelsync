# Authentication Setup Guide

## Quick Start

### Prerequisites
- Java 21+
- Node.js 18+
- Maven
- Google OAuth2 credentials (optional, for Google login)

### Backend Setup

1. **Set Environment Variables**

Create a `.env` file in the project root or set environment variables:

```bash
# Required for Google OAuth (optional)
export GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Frontend URL (for OAuth redirects)
export FRONTEND_URL="http://localhost:3000"
```

Or copy `.env.example` to `.env` and fill in your values.

2. **Run the Backend**

```bash
# From project root
./mvnw spring-boot:run
```

Backend will start on `http://localhost:8080`

### Frontend Setup

1. **Set Environment Variables**

Create a `.env.local` file in `src/main/webapp/`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Or copy `.env.example` to `.env.local`.

2. **Install Dependencies**

```bash
cd src/main/webapp
npm install
```

3. **Run the Frontend**

```bash
npm run dev
```

Frontend will start on `http://localhost:3000`

---

## Google OAuth Setup (Optional)

If you want to enable Google login:

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8080/login/oauth2/code/google` (for development)
     - `https://yourdomain.com/login/oauth2/code/google` (for production)
   - Copy the Client ID and Client Secret

2. **Configure Backend**
   - Set `GOOGLE_CLIENT_ID` environment variable
   - Set `GOOGLE_CLIENT_SECRET` environment variable
   - Restart backend

---

## Testing the Authentication Flow

### Test Password Login

1. **Sign Up**
   - Navigate to `http://localhost:3000/signup`
   - Fill in email, password, and name
   - Click through the signup steps
   - Should redirect to login with success message

2. **Sign In**
   - Navigate to `http://localhost:3000/login`
   - Enter email and password from signup
   - Click "Sign In"
   - Should redirect to dashboard

3. **Logout**
   - On dashboard, click "Logout" button in top right
   - Should clear session and redirect to login

### Test Google OAuth Login

1. **Sign In with Google**
   - Navigate to `http://localhost:3000/login`
   - Click "Continue with Google"
   - Authenticate with Google account
   - Should redirect back to dashboard
   - Check that user is created in database

2. **Logout**
   - Click "Logout" button
   - Should clear session

---

## Troubleshooting

### Backend Issues

**"CSRF token not found"**
- Ensure CSRF cookie is being set
- Check browser cookies for `XSRF-TOKEN`
- Try accessing `http://localhost:8080/api/auth/csrf` directly

**"401 Unauthorized"**
- Session may have expired (30 minute timeout)
- Try logging in again
- Check that JSESSIONID cookie is present

**Google OAuth fails**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check redirect URI matches Google Console configuration
- Ensure Google account has an email address

**"User does not use database authentication"**
- Trying to use password login with Google account
- Use "Continue with Google" instead

### Frontend Issues

**"Network Error"**
- Ensure backend is running on `http://localhost:8080`
- Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
- Verify CORS is configured correctly

**"Redirect loop"**
- Clear browser cookies
- Check that session is being saved on backend
- Verify `withCredentials: true` in apiClient

**Google button redirects to wrong URL**
- Check `next.config.ts` has OAuth2 rewrite
- Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly

---

## API Endpoints

### Public Endpoints
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Login with email/password
- `GET /api/auth/csrf` - Get CSRF token
- `GET /api/health` - Health check
- `GET /oauth2/authorization/google` - Initiate Google OAuth

### Authenticated Endpoints
- `GET /api/user/me` - Get current user
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/status` - Check authentication status
- `GET /api/trips/**` - Trip endpoints
- `GET /api/expenses/**` - Expense endpoints
- `GET /api/users` - List all users

---

## Security Notes

### Development
- Using HTTP (no HTTPS)
- Cookie `secure` flag is `false`
- CORS allows `http://localhost:3000`
- Session timeout: 30 minutes
- H2 console enabled at `/h2-console`

### Production Recommendations
1. **Use HTTPS**
   - Set `server.servlet.session.cookie.secure=true`
   - Configure SSL/TLS certificate

2. **Update CORS**
   - Set `app.frontend.url` to production domain
   - Restrict allowed origins

3. **Database**
   - Replace H2 with PostgreSQL/MySQL
   - Use connection pooling
   - Enable SSL for database connections

4. **Security Headers**
   - Enable Content Security Policy (CSP)
   - Set strict CORS policy
   - Add rate limiting

5. **Secrets Management**
   - Use secret manager (AWS Secrets Manager, etc.)
   - Don't commit secrets to git
   - Rotate credentials regularly

6. **Monitoring**
   - Enable security event logging
   - Monitor failed login attempts
   - Set up alerts for suspicious activity

---

## Architecture

### Authentication Providers
- **DATABASE** - Email/password authentication
- **GOOGLE** - Google OAuth2 authentication
- **APPLE** - Apple Sign In (not implemented yet)

### Session Management
- Spring Security session-based authentication
- Session stored in memory (change for production)
- Session timeout: 30 minutes
- Maximum 3 concurrent sessions per user

### CSRF Protection
- Cookie-based CSRF token (`XSRF-TOKEN`)
- Required for all non-GET requests
- Automatically handled by axios

### Password Security
- BCrypt hashing with default strength (10)
- Minimum 8 characters required
- Stored in database with user entity

---

## Development Tips

### Debug Authentication Issues
1. Check browser Network tab for failed requests
2. Check backend logs for exceptions
3. Verify cookies are being set (JSESSIONID, XSRF-TOKEN)
4. Test endpoints with curl:

```bash
# Get CSRF token
curl -c cookies.txt http://localhost:8080/api/auth/csrf

# Sign in
curl -b cookies.txt -c cookies.txt -X POST \
  http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: <token-from-cookie>" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check session
curl -b cookies.txt http://localhost:8080/api/user/me
```

### Reset Development State
```bash
# Backend - restart clears H2 database
./mvnw spring-boot:run

# Frontend - clear browser cookies
# Chrome: DevTools > Application > Cookies > Delete All
```

---

## Common Use Cases

### Add Another OAuth Provider
1. Add provider to `AuthProvider` enum
2. Configure in `application.properties`
3. Add to `SecurityConfig.oauth2Login()`
4. Update `UserService` to handle new provider
5. Add button to login page

### Implement Password Reset
1. Create reset token entity
2. Add email service
3. Create reset endpoints
4. Add reset flow to frontend

### Add Two-Factor Authentication
1. Add TOTP secret to user entity
2. Create QR code endpoint
3. Add verification endpoint
4. Update login flow

---

## Support

For issues or questions:
1. Check `AUTH_FLOW_FIXES.md` for detailed implementation
2. Review backend logs in console
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

