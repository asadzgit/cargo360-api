# AWS Deployment Guide for Cargo360 API

This guide will help you deploy your Cargo360 API to AWS using Elastic Beanstalk with PostgreSQL RDS and automatic GitHub deployment.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **EB CLI** (Elastic Beanstalk CLI) installed
4. **GitHub repository** with your code
5. **PostgreSQL RDS instance** set up

## Step 1: Set Up AWS RDS PostgreSQL Database

### Create RDS Instance
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "PostgreSQL"
4. Select "Production" template
5. Configure:
   - DB instance identifier: `cargo360-db`
   - Master username: `cargo360admin`
   - Master password: (generate strong password)
   - DB instance class: `db.t3.micro` (for testing) or `db.t3.small` (production)
   - Storage: 20 GB minimum
   - VPC: Default VPC
   - Publicly accessible: Yes (for initial setup)
   - Security group: Create new with PostgreSQL port 5432

### Note Your RDS Details
After creation, note these values for environment variables:
- **Endpoint**: `your-db-instance.region.rds.amazonaws.com`
- **Port**: `5432`
- **Database name**: `postgres` (default) or create custom
- **Username**: `cargo360admin`
- **Password**: Your chosen password

## Step 2: Set Up Elastic Beanstalk Application

### Install EB CLI
```bash
pip install awsebcli
```

### Initialize EB Application
```bash
cd /path/to/cargo360-api
eb init
```

Follow the prompts:
- Select region (e.g., `us-east-1`)
- Application name: `cargo360-api`
- Platform: `Node.js`
- Platform version: `Node.js 18 running on 64bit Amazon Linux 2`
- SSH: Yes (recommended)

### Create Environment
```bash
eb create cargo360-api-prod
```

## Step 3: Configure Environment Variables

### Set Production Environment Variables
```bash
eb setenv NODE_ENV=production \
  RDS_HOSTNAME=your-rds-endpoint.region.rds.amazonaws.com \
  RDS_USERNAME=cargo360admin \
  RDS_PASSWORD=your-db-password \
  RDS_DB_NAME=postgres \
  RDS_PORT=5432 \
  JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars \
  JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars \
  JWT_ACCESS_EXPIRES=15m \
  JWT_REFRESH_EXPIRES=7d \
  CORS_ORIGIN=https://your-frontend-domain.com \
  PORT=4000
```

### Alternative: Use AWS Console
1. Go to Elastic Beanstalk Console
2. Select your application → Environment
3. Go to Configuration → Software
4. Add environment properties

## Step 4: Deploy Your Application

### Manual Deployment
```bash
eb deploy
```

### Check Deployment Status
```bash
eb status
eb health
eb logs
```

## Step 5: Set Up GitHub Actions for Auto-Deployment

### Add GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### Create IAM User for GitHub Actions
1. Go to AWS IAM Console
2. Create new user: `github-actions-cargo360`
3. Attach policies:
   - `AWSElasticBeanstalkFullAccess`
   - `AmazonS3FullAccess`
4. Create access key and add to GitHub secrets

## Step 6: Database Setup

### Run Migrations
After first deployment:
```bash
eb ssh
cd /var/app/current
npm run db:migrate
npm run db:seed
exit
```

### Alternative: Automatic Migration
The `.ebextensions/02_npm_install.config` file automatically runs migrations on deployment.

## Step 7: Security Configuration

### Update RDS Security Group
1. Go to RDS Console → Your DB instance
2. Click on VPC security group
3. Edit inbound rules:
   - Remove public access (0.0.0.0/0)
   - Add your EB environment security group
   - Port: 5432, Source: EB security group

### Configure HTTPS (Recommended)
1. Go to EB Console → Configuration → Load balancer
2. Add HTTPS listener
3. Upload SSL certificate or use AWS Certificate Manager

## Step 8: Monitoring and Logging

### CloudWatch Logs
- Application logs: `/aws/elasticbeanstalk/cargo360-api-prod/var/log/eb-docker/containers/eb-current-app`
- Web server logs: Available in EB Console

### Health Monitoring
```bash
eb health --refresh
```

## Environment Files Reference

### Production Environment Variables (.env.production)
```env
NODE_ENV=production
PORT=4000
RDS_HOSTNAME=your-rds-endpoint.region.rds.amazonaws.com
RDS_USERNAME=cargo360admin
RDS_PASSWORD=your-secure-password
RDS_DB_NAME=postgres
RDS_PORT=5432
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
CORS_ORIGIN=https://your-domain.com
```

## Useful Commands

### EB CLI Commands
```bash
eb status                 # Check environment status
eb health                 # Check application health
eb logs                   # View recent logs
eb ssh                    # SSH into instance
eb deploy                 # Deploy current code
eb terminate             # Terminate environment
eb open                  # Open app in browser
```

### Database Commands
```bash
# Connect to RDS from local machine
psql -h your-rds-endpoint.region.rds.amazonaws.com -U cargo360admin -d postgres

# Run migrations on EB instance
eb ssh
cd /var/app/current
npm run db:migrate
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check RDS security group allows EB access
   - Verify environment variables are set correctly
   - Ensure RDS instance is running

2. **Migration Errors**
   - SSH into EB instance and run migrations manually
   - Check database exists and user has permissions

3. **Application Won't Start**
   - Check EB logs: `eb logs`
   - Verify Node.js version compatibility
   - Check package.json start script

4. **GitHub Actions Deployment Fails**
   - Verify AWS credentials in GitHub secrets
   - Check IAM permissions for GitHub Actions user
   - Review workflow logs in GitHub Actions tab

### Log Locations
- Application logs: `/var/log/eb-engine.log`
- Web server logs: `/var/log/nginx/`
- Application stdout: `/var/log/eb-stdouterr.log`

## Cost Optimization

1. **Use t3.micro instances** for development
2. **Set up auto-scaling** based on CPU usage
3. **Use RDS t3.micro** for development
4. **Enable RDS automated backups** with 7-day retention
5. **Monitor CloudWatch costs** regularly

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use IAM roles** instead of access keys when possible
3. **Enable RDS encryption** at rest
4. **Use HTTPS** for all API endpoints
5. **Regularly rotate** JWT secrets and database passwords
6. **Limit RDS access** to EB security group only

## Next Steps

1. Set up custom domain with Route 53
2. Configure CloudFront CDN
3. Implement proper logging with CloudWatch
4. Set up monitoring and alerting
5. Configure backup and disaster recovery
6. Implement blue-green deployments

---

For support, check AWS documentation or contact your DevOps team.
