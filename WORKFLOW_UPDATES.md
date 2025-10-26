# GitHub Actions Workflow Updates

## Summary

Your existing `deploy-apps.yml` workflow has been updated with critical features to prevent the CORS and frontend URL issues you experienced in production.

## Updates Made to `.github/workflows/deploy-apps.yml`

### 1. ✅ CORS Configuration (NEW)

**What was added:**
```yaml
- name: Configure CORS
  run: |
    az containerapp ingress cors update \
      --name $BACKEND_NAME \
      --resource-group $RG_NAME \
      --allowed-origins "https://$FRONTEND_URL" \
      --allowed-methods GET POST PUT DELETE OPTIONS \
      --allowed-headers "*" \
      --expose-headers "*" \
      --max-age 3600 \
      --allow-credentials true
```

**Why this matters:**
- Automatically configures CORS after every backend deployment
- Prevents the document upload CORS errors you experienced
- Uses the frontend URL from Terraform outputs (no hardcoding)

### 2. ✅ Production Environment File (FIXED)

**What changed:**
```yaml
# BEFORE: Environment variable approach (doesn't work reliably with Astro)
- name: Build Frontend
  run: npm run build
  env:
    PUBLIC_BACKEND_URL: ${{ steps.get-backend-url.outputs.backend_url }}

# AFTER: Create .env.production file (works correctly)
- name: Create Production Environment File
  run: |
    echo "PUBLIC_BACKEND_URL=${{ steps.get-backend-url.outputs.backend_url }}" > .env.production

- name: Build Frontend
  run: npm run build
```

**Why this matters:**
- Astro's `import.meta.env` needs `.env.production` file during build
- Environment variables passed to `npm run build` may not be available to Astro's build process
- Prevents the frontend from calling localhost:3001 in production

### 3. ✅ Build Verification (NEW)

**What was added:**
```yaml
- name: Verify Backend URL in Build
  run: |
    if grep -r "projectpal-dev-backend" ./dist > /dev/null; then
      echo "✅ Backend URL found in built files"
    else
      echo "❌ WARNING: Backend URL not found in built files!"
      exit 1
    fi
```

**Why this matters:**
- Catches the issue if the backend URL doesn't make it into the build
- Fails the deployment early rather than deploying a broken frontend
- Provides immediate feedback about configuration issues

### 4. ✅ Health Checks (NEW)

**What was added:**
A new `health-check` job that runs after deployment:

```yaml
health-check:
  name: 'Verify Deployment Health'
  needs: [deploy-backend, deploy-frontend]
  steps:
    - Check Backend Health (HTTP 200)
    - Check Frontend Accessibility (HTTP 200)
    - Test CORS Preflight (access-control headers)
```

**Why this matters:**
- Verifies the deployment actually works before marking it as successful
- Tests the exact same things that caused issues in production
- Provides immediate feedback if something breaks

## Other Workflows (No Changes Required)

### `terraform-apply.yml` ✅
- Already working correctly
- Deploys infrastructure and outputs URLs
- Triggers `deploy-apps.yml` via `workflow_run`

### `terraform-plan.yml` ✅
- Already working correctly
- No changes needed

### `pr-validation.yml` ✅
- Already working correctly
- Uses placeholder URL for builds (appropriate for PRs)
- No changes needed

## What You Need to Do

### 1. Test the Updated Workflow

The updated workflow is ready to use. On your next commit to `main` that changes backend or frontend code:

```bash
git add .github/workflows/deploy-apps.yml
git commit -m "Enhanced deployment workflow with CORS config and health checks"
git push origin main
```

The workflow will:
1. Build and deploy backend
2. **Automatically configure CORS** ✨
3. **Create .env.production** ✨
4. Build and deploy frontend
5. **Verify backend URL in build** ✨
6. **Run health checks** ✨

### 2. Monitor the Deployment

After pushing, check:
- **Actions tab** in GitHub for workflow progress
- **Step Summary** will show all health check results
- Health checks will verify:
  - Backend returns 200 OK
  - Frontend is accessible
  - CORS headers are correct

### 3. Delete Temporary Workflow (Optional)

You can delete `.github/workflows/deploy.yml` (the one I created before realizing you had existing workflows):

```bash
rm .github/workflows/deploy.yml
```

## Comparison: Old vs New Workflow

| Feature | Before | After |
|---------|--------|-------|
| CORS Configuration | ❌ Manual only | ✅ Automatic |
| Frontend .env | ⚠️ Build-time env var | ✅ .env.production file |
| Build Verification | ❌ None | ✅ Checks backend URL |
| Health Checks | ❌ None | ✅ Full validation |
| CORS Testing | ❌ None | ✅ Preflight test |

## Key Improvements

1. **Prevents CORS Issues**: Automatically configures CORS after every backend deployment
2. **Prevents URL Issues**: Creates `.env.production` file ensuring backend URL is available to Astro
3. **Early Detection**: Verifies backend URL in built files before deployment
4. **Validation**: Health checks catch issues before users do
5. **Confidence**: Every deployment is automatically validated

## What This Solves

✅ **CORS Errors**: Automatic CORS configuration prevents "blocked:csp" errors  
✅ **Frontend URL Issues**: `.env.production` ensures frontend calls correct backend URL  
✅ **Silent Failures**: Health checks detect and fail on deployment issues  
✅ **Manual Steps**: Eliminates need to manually configure CORS via Azure CLI  
✅ **Verification**: Automatic testing ensures deployment works end-to-end

## Next Steps

1. **Commit the changes** to `deploy-apps.yml`
2. **Push to main** to trigger the workflow
3. **Monitor the first run** to see health checks in action
4. **Delete temporary files**:
   - `.github/workflows/deploy.yml` (if you don't want it)
   - `DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_STATUS.md` (if covered by your own docs)

Your existing CI/CD setup is now production-ready with all the fixes automated! 🚀
