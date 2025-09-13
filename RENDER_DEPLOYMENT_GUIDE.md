# Render Deployment Guide - Cargo360 API

Deploy your Node.js API with PostgreSQL to Render in minutes. Simple, reliable, and production-ready.

## Why Render?

- ✅ **Free PostgreSQL database** - No credit card required
- ✅ **Auto-deploy from GitHub** - Push code, auto-deploy
- ✅ **SSL certificates** - HTTPS included
- ✅ **Simple pricing** - $7/month for starter plan
- ✅ **Zero configuration** - Works out of the box

## Step 1: Deploy to Render

### Quick Deploy
1. **Go to**: [render.com](https://render.com)
2. **Sign up with GitHub**
3. **Click "New +"** → **Web Service**
4. **Connect GitHub repository**: `asadzgit/cargo360-api`
5. **Configure**:
   - **Name**: `cargo360-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

## Step 2: Create PostgreSQL Database

1. **In Render Dashboard** → **New +** → **PostgreSQL**
2. **Configure**:
   - **Name**: `cargo360-db`
   - **Database**: `cargo360_production`
   - **User**: `cargo360_user`
   - **Plan**: Free (or Starter $7/month)

3. **Copy Database URL** from database dashboard

## Step 3: Set Environment Variables

**In your Web Service** → **Environment**:

```env
NODE_ENV=production
DATABASE_URL=postgresql://cargo360_user:password@hostname:port/cargo360_production
JWT_ACCESS_SECRET=your-32-char-secret-key-generate-this
JWT_REFRESH_SECRET=your-32-char-refresh-key-generate-this
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=*
PORT=10000
```

**Important**: 
- Copy `DATABASE_URL` from your PostgreSQL service
- Generate strong 32+ character secrets for JWT keys
- Render automatically sets `PORT=10000`

## Step 4: Run Database Setup

### Option A: Manual Setup (First Time)
1. **Go to your Web Service** → **Shell**
2. **Run migrations**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Option B: Automatic Setup
The `render.yaml` file I created handles this automatically on deployment.

## Step 5: Custom Domain (Optional)

1. **Web Service** → **Settings** → **Custom Domains**
2. **Add domain**: `api.cargo360.com`
3. **Update DNS** with Render's CNAME
4. **SSL certificate** automatically provided

## Environment Variables Reference

**Required Variables**:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_ACCESS_SECRET=min-32-chars-secret
JWT_REFRESH_SECRET=min-32-chars-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

**Optional Variables**:
```env
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Automatic Deployments

**Render automatically deploys when you**:
- Push to connected branch (usually `main`)
- Merge pull requests
- Make any commits to the repository

**Deploy Process**:
1. Render pulls latest code
2. Runs `npm install`
3. Runs build command (migrations)
4. Starts with `npm start`
5. Health checks ensure app is running

## Database Management

### Connect to Database
```bash
# Get connection details from Render dashboard
psql postgresql://user:pass@host:port/database
```

### Run Migrations
```bash
# In Render Shell or locally
npm run db:migrate
npm run db:seed
```

### Database Backups
- **Free Plan**: No automatic backups
- **Starter Plan**: Daily backups included
- **Manual backup**: Use `pg_dump` command

## Monitoring & Logs

### View Logs
- **Render Dashboard** → **Your Service** → **Logs**
- Real-time log streaming
- Filter by log level and time

### Monitor Performance
- **Metrics tab**: CPU, Memory, Response times
- **Events tab**: Deployment history
- **Health checks**: Automatic monitoring

## Pricing

### Free Tier
- **Web Service**: 750 hours/month (enough for 1 app)
- **PostgreSQL**: 1 free database (90 days, then $7/month)
- **Bandwidth**: 100GB/month
- **Custom domains**: Included

### Starter Plan ($7/month per service)
- **Unlimited hours**
- **Daily backups**
- **Faster builds**
- **Priority support**

## Troubleshooting

### Common Issues

**1. App won't start**
```bash
# Check logs in Render dashboard
# Common fixes:
# - Verify "start" script in package.json
# - Check PORT environment variable (should be 10000)
# - Ensure all dependencies in package.json
```

**2. Database connection failed**
```bash
# Verify DATABASE_URL format:
# postgresql://user:password@host:port/database

# Test connection in Shell:
node -e "console.log(process.env.DATABASE_URL)"
```

**3. Build failures**
```bash
# Check build logs
# Common issues:
# - Missing dependencies
# - Node.js version mismatch
# - Build command errors
```

**4. Migration errors**
```bash
# Run manually in Shell:
npm run db:migrate

# Check database exists and user has permissions
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets to Git
2. **Database Access**: Use connection string from Render
3. **CORS**: Set specific origins in production
4. **JWT Secrets**: Use 32+ character random strings
5. **HTTPS**: Always enabled on Render
6. **Database**: Enable SSL (automatic on Render)

## Commands Reference

### Local Development
```bash
# Test with Render database locally
export DATABASE_URL="postgresql://user:pass@host:port/db"
npm run dev
```

### Render Shell Commands
```bash
# Access your deployed app's shell
# Available in Render Dashboard → Shell tab

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Check environment
env | grep DATABASE_URL

# Test database connection
node -e "const db = require('./models'); db.sequelize.authenticate().then(() => console.log('Connected')).catch(console.error)"
```

## Deployment Checklist

- [ ] GitHub repository connected
- [ ] PostgreSQL database created
- [ ] DATABASE_URL environment variable set
- [ ] JWT secrets configured (32+ characters)
- [ ] NODE_ENV=production set
- [ ] CORS_ORIGIN configured for your frontend
- [ ] Database migrations run successfully
- [ ] App starts without errors
- [ ] API endpoints responding correctly

## Migration from Other Platforms

### From AWS
- Much simpler setup (no IAM, RDS complexity)
- Built-in PostgreSQL vs separate RDS
- Automatic SSL vs manual certificate management
- Simpler environment variable management

### From Heroku
- Similar developer experience
- Better pricing structure
- Faster build times
- More transparent pricing

## Production Tips

1. **Use Starter plan** for production apps
2. **Enable daily backups** (Starter plan)
3. **Set up monitoring** alerts
4. **Use custom domain** for professional API
5. **Monitor resource usage** in dashboard
6. **Keep dependencies updated**

## API Testing

Once deployed, your API will be available at:
```
https://cargo360-api.onrender.com
```

Test endpoints:
```bash
# Health check
curl https://cargo360-api.onrender.com/

# Auth endpoints
curl -X POST https://cargo360-api.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","role":"customer"}'
```

## Support

- **Documentation**: [render.com/docs](https://render.com/docs)
- **Community**: [community.render.com](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com)

Render provides excellent support and documentation for troubleshooting deployment issues.
