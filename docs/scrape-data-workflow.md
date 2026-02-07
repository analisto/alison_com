# scrape-data.yml - GitHub Actions Workflow

## Overview
Automated GitHub Actions workflow that schedules and executes bus route data scraping every 3 hours. This workflow ensures the database is continuously updated with fresh data from the Ayna Transport API without manual intervention.

## Purpose
This workflow automates the data collection pipeline by:
- Running scrapers on a fixed schedule (every 3 hours)
- Ensuring data freshness in the database
- Providing log artifacts for debugging
- Reporting success/failure status
- Enabling manual data refresh triggers
- Maintaining sequential execution order (stops → bus details)

## Workflow File Location
```
.github/workflows/scrape-data.yml
```

## Trigger Configuration

### Scheduled Execution
```yaml
on:
  schedule:
    - cron: '0 */3 * * *'
```

**Cron Expression**: `0 */3 * * *`
- Runs every 3 hours at the top of the hour
- Examples: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC

**Cron Breakdown**:
```
┌───────────── minute (0)
│ ┌───────────── hour (*/3 = every 3 hours)
│ │ ┌───────────── day of month (*)
│ │ │ ┌───────────── month (*)
│ │ │ │ ┌───────────── day of week (*)
│ │ │ │ │
0 */3 * * *
```

### Manual Trigger
```yaml
workflow_dispatch:
```

Allows manual execution via GitHub UI:
- Go to **Actions** tab
- Select **Scrape Bus Route Data** workflow
- Click **Run workflow**

## Environment Configuration

### Python Version
```yaml
env:
  PYTHON_VERSION: '3.11'
```

Uses Python 3.11 for all jobs to ensure consistency with development environment.

### Database Connection
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Uses GitHub Secrets to securely store database credentials. Never exposes credentials in logs.

## Workflow Jobs

The workflow consists of 3 sequential jobs:

### Job 1: scrape-stops

Fetches and stores bus stop data.

```yaml
scrape-stops:
  name: Scrape Bus Stops
  runs-on: ubuntu-latest
```

**Steps**:

1. **Checkout repository**
   ```yaml
   - name: Checkout repository
     uses: actions/checkout@v4
   ```
   Clones the repository code to the runner.

2. **Set up Python**
   ```yaml
   - name: Set up Python
     uses: actions/setup-python@v5
     with:
       python-version: ${{ env.PYTHON_VERSION }}
       cache: 'pip'
   ```
   - Installs Python 3.11
   - Caches pip dependencies for faster runs

3. **Install dependencies**
   ```yaml
   - name: Install dependencies
     run: |
       python -m pip install --upgrade pip
       pip install -r requirements.txt
   ```
   Installs required packages: requests, psycopg2-binary, python-dotenv

4. **Run stops scraper**
   ```yaml
   - name: Run stops scraper
     env:
       DATABASE_URL: ${{ secrets.DATABASE_URL }}
     run: |
       cd scripts
       python stops.py
   ```
   - Changes to scripts directory
   - Executes stops.py with DATABASE_URL from secrets
   - Truncates ayna.stops table
   - Inserts ~3,841 fresh stop records

5. **Upload logs**
   ```yaml
   - name: Upload logs
     if: always()
     uses: actions/upload-artifact@v4
     with:
       name: stops-scraper-logs
       path: |
         *.log
       retention-days: 7
   ```
   - Runs even if previous steps fail (`if: always()`)
   - Uploads all .log files as artifacts
   - Retains logs for 7 days

**Expected Output**:
```
Testing database connection...
✓ Database connection successful!
Fetching stops data from API...
✓ Successfully fetched 3841 stops
✓ Successfully saved 3841 stops to database
```

**Exit Code**: 0 (success) or 1 (failure)

---

### Job 2: scrape-bus-details

Fetches and stores comprehensive bus route data.

```yaml
scrape-bus-details:
  name: Scrape Bus Details
  runs-on: ubuntu-latest
  needs: scrape-stops  # Wait for stops to complete first
```

**Dependency**: This job waits for `scrape-stops` to complete successfully before starting.

**Steps**:

1. **Checkout repository**
   ```yaml
   - name: Checkout repository
     uses: actions/checkout@v4
   ```

2. **Set up Python**
   ```yaml
   - name: Set up Python
     uses: actions/setup-python@v5
     with:
       python-version: ${{ env.PYTHON_VERSION }}
       cache: 'pip'
   ```

3. **Install dependencies**
   ```yaml
   - name: Install dependencies
     run: |
       python -m pip install --upgrade pip
       pip install -r requirements.txt
   ```

4. **Run bus details scraper**
   ```yaml
   - name: Run bus details scraper
     env:
       DATABASE_URL: ${{ secrets.DATABASE_URL }}
     run: |
       cd scripts
       python busDetails.py
   ```
   - Changes to scripts directory
   - Executes busDetails.py with DATABASE_URL from secrets
   - Fetches 209 buses from API (208 succeed, 1 fails - bus ID 96)
   - Truncates 8 tables with CASCADE
   - Inserts fresh data:
     - 2 payment types
     - 1 region
     - 1 working zone type
     - 2,700 stop details
     - 208 buses
     - 11,786 bus stops
     - 416 routes
     - 109,147 route coordinates

5. **Upload logs**
   ```yaml
   - name: Upload logs
     if: always()
     uses: actions/upload-artifact@v4
     with:
       name: bus-details-scraper-logs
       path: |
         *.log
       retention-days: 7
   ```

**Expected Output**:
```
Successfully fetched 209 buses
Successfully fetched details for 208/209 buses
✓ Saved 208 buses
✓ Saved 11786 bus stops
✓ Saved 416 routes
✓ Saved 109147 route coordinates
✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!
```

**Exit Code**: 0 (success) or 1 (failure)

---

### Job 3: notify-completion

Reports the final status of the workflow.

```yaml
notify-completion:
  name: Notify Completion
  runs-on: ubuntu-latest
  needs: [scrape-stops, scrape-bus-details]
  if: always()
```

**Dependencies**: Waits for both previous jobs to complete (regardless of success/failure).

**Steps**:

1. **Report Status**
   ```yaml
   - name: Report Status
     run: |
       echo "Scraping workflow completed"
       echo "Stops job: ${{ needs.scrape-stops.result }}"
       echo "Bus details job: ${{ needs.scrape-bus-details.result }}"

       if [ "${{ needs.scrape-stops.result }}" == "success" ] && [ "${{ needs.scrape-bus-details.result }}" == "success" ]; then
         echo "✓ All scraping jobs completed successfully"
         exit 0
       else
         echo "✗ Some scraping jobs failed"
         exit 1
       fi
   ```

**Possible Outputs**:

Success:
```
Scraping workflow completed
Stops job: success
Bus details job: success
✓ All scraping jobs completed successfully
```

Failure:
```
Scraping workflow completed
Stops job: success
Bus details job: failure
✗ Some scraping jobs failed
```

## Workflow Execution Flow

```
┌─────────────────────────────────────────┐
│  Trigger (cron or manual)               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Job 1: scrape-stops                    │
│  ├─ Checkout code                       │
│  ├─ Setup Python 3.11                   │
│  ├─ Install dependencies                │
│  ├─ Run stops.py                        │
│  └─ Upload logs                         │
└─────────────────┬───────────────────────┘
                  │ (success)
                  ▼
┌─────────────────────────────────────────┐
│  Job 2: scrape-bus-details              │
│  ├─ Checkout code                       │
│  ├─ Setup Python 3.11                   │
│  ├─ Install dependencies                │
│  ├─ Run busDetails.py                   │
│  └─ Upload logs                         │
└─────────────────┬───────────────────────┘
                  │ (always)
                  ▼
┌─────────────────────────────────────────┐
│  Job 3: notify-completion               │
│  └─ Report final status                 │
└─────────────────────────────────────────┘
```

## GitHub Actions Used

### actions/checkout@v4
- **Purpose**: Clones repository to the runner
- **Version**: v4 (latest stable)
- **Documentation**: https://github.com/actions/checkout

### actions/setup-python@v5
- **Purpose**: Installs Python on the runner
- **Version**: v5 (latest stable)
- **Features**: Pip caching for faster runs
- **Documentation**: https://github.com/actions/setup-python

### actions/upload-artifact@v4
- **Purpose**: Saves log files for download
- **Version**: v4 (latest stable)
- **Retention**: 7 days
- **Documentation**: https://github.com/actions/upload-artifact

## Prerequisites

### 1. GitHub Repository Secret

Must be configured before workflow can run:

**Secret Name**: `DATABASE_URL`

**Secret Value**:
```
postgresql://user:password@host:port/database?sslmode=require
```

**Setup Steps**:
1. Go to repository **Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add `DATABASE_URL` with your database connection string

### 2. Database Schema

Database must have schema already created:
```bash
python scripts/run_migrations.py
```

The workflow does NOT run migrations automatically.

### 3. GitHub Actions Enabled

Ensure Actions are enabled in repository settings.

## Monitoring and Debugging

### View Workflow Runs

1. Go to **Actions** tab in GitHub
2. Click **Scrape Bus Route Data** workflow
3. View list of runs with status:
   - ✅ Green: Success
   - ❌ Red: Failure
   - 🟡 Yellow: In progress
   - ⚪ Gray: Queued

### View Detailed Logs

1. Click on a workflow run
2. Click on job name (e.g., "Scrape Bus Stops")
3. Expand steps to see detailed output
4. Look for errors marked in red

### Download Log Artifacts

1. Click on completed workflow run
2. Scroll to **Artifacts** section
3. Download:
   - `stops-scraper-logs.zip`
   - `bus-details-scraper-logs.zip`
4. Extract and review .log files

### Common Log Indicators

**Success Indicators**:
```
✓ Database connection successful!
✓ Successfully fetched X stops
✓ Successfully saved X stops to database
✓ ALL OPERATIONS COMPLETED SUCCESSFULLY!
```

**Failure Indicators**:
```
✗ Database connection failed!
✗ Network error: ...
✗ Failed to fetch bus details
ERROR: ...
```

## Performance Metrics

### Execution Time

Typical workflow execution:

| Job | Duration | Notes |
|-----|----------|-------|
| Setup (checkout, Python, deps) | ~30-45s | Cached after first run |
| Scrape Stops | ~5-10s | API + database operations |
| Scrape Bus Details | ~30-40s | 209 API requests + database operations |
| **Total** | **~1.5-2 minutes** | Full workflow completion |

### Resource Usage

- **Runner**: ubuntu-latest (free for public repos)
- **Memory**: ~500MB peak
- **Disk**: ~200MB (code + dependencies)
- **Network**: ~20MB (API responses)

### GitHub Actions Minutes

Free tier limits:
- **Public repos**: Unlimited minutes
- **Private repos**: 2,000 minutes/month

This workflow uses approximately:
- 2 minutes × 8 runs/day = **16 minutes/day**
- **~480 minutes/month**

## Customization

### Change Schedule Frequency

Edit the cron expression:

```yaml
on:
  schedule:
    # Every 6 hours
    - cron: '0 */6 * * *'

    # Daily at midnight UTC
    - cron: '0 0 * * *'

    # Every hour
    - cron: '0 */1 * * *'

    # Twice daily (6 AM and 6 PM UTC)
    - cron: '0 6,18 * * *'

    # Weekdays only at 9 AM UTC
    - cron: '0 9 * * 1-5'
```

Use [crontab.guru](https://crontab.guru/) to validate cron expressions.

### Change Python Version

Update the environment variable:

```yaml
env:
  PYTHON_VERSION: '3.12'  # Or '3.10', '3.9', etc.
```

### Add Notifications

Add notification step to `notify-completion` job:

```yaml
- name: Send Slack Notification
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ Bus scraping workflow failed!"
      }
```

### Change Log Retention

Modify retention period:

```yaml
- name: Upload logs
  uses: actions/upload-artifact@v4
  with:
    name: stops-scraper-logs
    retention-days: 30  # Keep logs for 30 days
```

## Troubleshooting

### Workflow Not Running on Schedule

**Symptoms**: No automatic runs every 3 hours

**Possible Causes**:
1. Repository is inactive (GitHub pauses scheduled workflows after 60 days of no activity)
2. Workflow file has syntax errors
3. Actions are disabled in repository settings

**Solutions**:
1. Make a commit to re-enable scheduled workflows
2. Validate YAML syntax using online validator
3. Check Settings → Actions → Allow all actions

### Database Connection Failed

**Error Message**:
```
✗ Database connection failed!
could not connect to server
```

**Solutions**:
1. Verify `DATABASE_URL` secret is set correctly
2. Check database accepts connections from GitHub IPs
3. Ensure database is online and accessible
4. Verify SSL mode matches database requirements

### Stops Job Succeeds, Bus Details Fails

**Error Message**:
```
Table 'ayna.buses' does not exist
```

**Solution**: Run migrations to create schema:
```bash
python scripts/run_migrations.py
```

### Dependency Installation Fails

**Error Message**:
```
ERROR: Could not find a version that satisfies the requirement...
```

**Solutions**:
1. Check `requirements.txt` is committed to repository
2. Verify Python version compatibility
3. Update package versions in requirements.txt

### Job Exceeds Timeout

**Error Message**:
```
The job running on runner ... has exceeded the maximum execution time of 360 minutes.
```

**Solution**: Add timeout configuration:
```yaml
jobs:
  scrape-stops:
    timeout-minutes: 10  # Set reasonable timeout
```

### API Rate Limiting

**Error Message**:
```
✗ Network error: 429 Too Many Requests
```

**Solution**: Increase delay between requests in Python scripts or reduce workflow frequency.

## Security Considerations

### ✅ Secure Practices

- **Secrets Management**: Database credentials stored in GitHub Secrets (encrypted)
- **No Credential Exposure**: Secrets never appear in logs
- **Minimal Permissions**: Workflow only has necessary permissions
- **Public Code, Private Data**: Code is public, data access requires secrets

### ⚠️ Security Warnings

- **Never commit DATABASE_URL** to .env or any file in the repository
- **Limit database user permissions** to only what's needed (CREATE, INSERT, UPDATE, DELETE on ayna schema)
- **Use SSL mode** in production databases
- **Rotate credentials** periodically

## Best Practices

### 1. Monitor Workflow Runs

Check Actions tab weekly to ensure:
- Workflows are running on schedule
- Success rate is acceptable
- No persistent failures

### 2. Review Logs

Download and review log artifacts if:
- Workflow fails unexpectedly
- Data counts seem incorrect
- Performance degrades

### 3. Test Changes Locally

Before modifying workflow:
1. Test scraper scripts locally
2. Verify database operations
3. Test with workflow_dispatch before relying on schedule

### 4. Version Control

- Use semantic versioning for Action versions (v4, v5, not latest)
- Pin Python version to avoid unexpected breakage
- Document all workflow changes in commit messages

### 5. Graceful Degradation

- Script continues if individual bus fails (bus ID 96)
- Logs uploaded even if job fails
- Status reported regardless of outcome

## Integration with Other Systems

### Webhooks

Add webhook notification on workflow completion:

```yaml
- name: Trigger Webhook
  if: success()
  run: |
    curl -X POST https://your-webhook.com/notify \
      -H "Content-Type: application/json" \
      -d '{"status": "success", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

### Dashboard Updates

Trigger dashboard rebuild after scraping:

```yaml
- name: Rebuild Dashboard
  if: success()
  run: |
    curl -X POST https://api.vercel.com/v1/integrations/deploy/... \
      -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}"
```

### Data Quality Checks

Add validation step:

```yaml
- name: Validate Data
  run: |
    python scripts/validate_data.py
    if [ $? -ne 0 ]; then
      echo "❌ Data validation failed"
      exit 1
    fi
```

## Related Files

- **scripts/stops.py**: Stops scraper executed in first job
- **scripts/busDetails.py**: Bus details scraper executed in second job
- **scripts/db_utils.py**: Database utilities used by both scrapers
- **scripts/run_migrations.py**: Schema setup (run manually, not in workflow)
- **requirements.txt**: Python dependencies installed by workflow
- **.env**: Local development environment (not used by workflow)

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Cron Expression Reference](https://crontab.guru/)
- [GitHub Actions Pricing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Workflow Status Badge

Add to README.md:

```markdown
[![Scrape Bus Route Data](https://github.com/YOUR_USERNAME/bus_route_dashboard/actions/workflows/scrape-data.yml/badge.svg)](https://github.com/YOUR_USERNAME/bus_route_dashboard/actions/workflows/scrape-data.yml)
```

Replace `YOUR_USERNAME` with your GitHub username.

This shows real-time workflow status in your README!
