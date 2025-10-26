# Memory Storage Setup Guide

ProjectPal supports two memory storage options:
- **Local File Storage** (Development)
- **Azure Cosmos DB** (Production)

## 🗂️ Local File Storage (Development)

### Configuration

Add to your `.env` file:

```env
# Memory Storage Type (file or cosmos)
MEMORY_STORAGE_TYPE=file

# Optional: Custom memory directory (defaults to ./memory)
MEMORY_DIR=./memory
```

### How it Works

- Conversations are stored as JSON files in the `memory` folder
- Each conversation thread gets its own file: `<threadId>.json`
- Files persist across server restarts
- Perfect for local development and testing

### Example File Structure

```
backend/
└── memory/
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
    ├── b2c3d4e5-f6g7-8901-bcde-fg2345678901.json
    └── ...
```

### Sample Conversation File

```json
{
  "threadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user123",
  "messages": [
    {
      "role": "user",
      "content": "Who are the available AI engineers?",
      "timestamp": "2025-10-25T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Here are the available AI engineers...",
      "timestamp": "2025-10-25T10:30:05.000Z",
      "toolCalls": [...]
    }
  ],
  "createdAt": "2025-10-25T10:30:00.000Z",
  "updatedAt": "2025-10-25T10:30:05.000Z",
  "metadata": {}
}
```

---

## ☁️ Azure Cosmos DB (Production)

### Why Cosmos DB?

- ✅ Globally distributed database
- ✅ Automatic scaling
- ✅ 99.999% availability SLA
- ✅ Serverless option (pay-per-use)
- ✅ Multi-region replication
- ✅ Low latency worldwide

### Cost Estimate

| Tier | Use Case | Monthly Cost |
|------|----------|--------------|
| **Free Tier** | Development/Testing (400 RU/s, 25 GB) | $0 |
| **Serverless** | Low traffic (pay-per-request) | $0-$25/month |
| **Provisioned 400 RU/s** | Small production | ~$24/month |
| **Provisioned 1000 RU/s** | Medium production | ~$60/month |
| **Autoscale** | Variable traffic | ~$24-$200/month |

### Setup Steps

#### 1. Create Cosmos DB Account

```bash
# Using Azure CLI
az cosmosdb create \
  --name projectpal-db \
  --resource-group your-resource-group \
  --default-consistency-level Session \
  --enable-free-tier true

# Or create via Azure Portal:
# https://portal.azure.com/#create/Microsoft.DocumentDB
```

#### 2. Get Connection Details

From Azure Portal:
1. Go to your Cosmos DB account
2. Click on "Keys" in the left menu
3. Copy:
   - **URI** (endpoint)
   - **PRIMARY KEY** (or Secondary Key)

#### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Memory Storage Type
MEMORY_STORAGE_TYPE=cosmos

# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_DB_KEY=your-primary-key-here==
COSMOS_DB_DATABASE=ProjectPalDB
COSMOS_DB_CONTAINER=Conversations
```

#### 4. Database & Container Creation

The system automatically creates:
- **Database**: `ProjectPalDB` (configurable)
- **Container**: `Conversations` (configurable)
- **Partition Key**: `/threadId`

No manual setup required!

### Enable Free Tier

```bash
# When creating account, add:
az cosmosdb create \
  --name projectpal-db \
  --resource-group your-resource-group \
  --enable-free-tier true

# Free tier includes:
# - 1000 RU/s throughput
# - 25 GB storage
# - Perfect for development/small apps
```

### Serverless Mode (Recommended for Start)

```bash
az cosmosdb create \
  --name projectpal-db \
  --resource-group your-resource-group \
  --capabilities EnableServerless

# Serverless pricing:
# - $0.25 per million Read RUs
# - $1.25 per million Write RUs
# - $0.25/GB storage
# - No minimum cost!
```

---

## 🔄 Switching Between Storage Types

Simply change the `MEMORY_STORAGE_TYPE` in your `.env`:

```env
# Local development
MEMORY_STORAGE_TYPE=file

# Production
MEMORY_STORAGE_TYPE=cosmos
```

The application automatically uses the correct storage without code changes!

---

## 📊 Usage Examples

### Start New Conversation

```bash
POST /api/chat
{
  "message": "Who are the available AI engineers?"
}

Response:
{
  "type": "complete",
  "response": "...",
  "threadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Continue Existing Conversation

```bash
POST /api/chat
{
  "message": "What about data scientists?",
  "threadId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

The AI will remember the previous conversation context!

---

## 🔒 Security Best Practices

### For Cosmos DB:

1. **Use Azure Key Vault** for storing keys
2. **Enable IP Firewall** to restrict access
3. **Use Managed Identity** in Azure deployments
4. **Rotate keys regularly**
5. **Enable Advanced Threat Protection**

### Example with Managed Identity:

```typescript
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const client = new CosmosClient({ 
  endpoint,
  aadCredentials: credential 
});
```

---

## 🚀 Deployment

### Local Development

```bash
cd backend
npm install
npm run server:dev
```

### Azure App Service

```env
# Set in App Service Configuration:
MEMORY_STORAGE_TYPE=cosmos
COSMOS_DB_ENDPOINT=https://...
COSMOS_DB_KEY=...
COSMOS_DB_DATABASE=ProjectPalDB
COSMOS_DB_CONTAINER=Conversations
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "server"]
```

```bash
# Build and run
docker build -t projectpal-backend .
docker run -p 3001:3001 \
  -e MEMORY_STORAGE_TYPE=cosmos \
  -e COSMOS_DB_ENDPOINT=... \
  -e COSMOS_DB_KEY=... \
  projectpal-backend
```

---

## 🧪 Testing

### Test Local Storage

```bash
# Start with file storage
MEMORY_STORAGE_TYPE=file npm run server:dev

# Check memory folder
ls -la memory/
```

### Test Cosmos DB

```bash
# Start with Cosmos DB
MEMORY_STORAGE_TYPE=cosmos npm run server:dev

# Verify in Azure Portal > Data Explorer
```

---

## 📈 Monitoring

### Local Storage

```bash
# Check memory folder size
du -sh memory/

# Count conversations
ls memory/*.json | wc -l
```

### Cosmos DB

Azure Portal provides:
- Request Units (RU/s) usage
- Storage size
- Latency metrics
- Request count
- Error rates

---

## 🐛 Troubleshooting

### "Cosmos DB container not initialized"

**Solution**: Check your connection string and ensure the account exists

### "Thread not found"

**Solution**: ThreadId might be invalid or expired. Start a new conversation.

### High Cosmos DB Costs

**Solutions**:
1. Switch to serverless mode
2. Enable free tier
3. Optimize query patterns
4. Add TTL to old conversations

### Permission Errors

**Solution**: Verify the Cosmos DB key has read/write permissions

---

## 💡 Best Practices

1. **Use File Storage** for local development
2. **Use Cosmos DB Free Tier** for staging
3. **Use Cosmos DB Serverless** for production (small-medium scale)
4. **Use Cosmos DB Provisioned** for large scale (>100k users)
5. **Implement conversation TTL** to auto-delete old threads
6. **Monitor RU consumption** to optimize costs
7. **Use connection pooling** for better performance

---

## 🔗 Resources

- [Azure Cosmos DB Docs](https://docs.microsoft.com/azure/cosmos-db/)
- [Cosmos DB Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Free Tier Details](https://docs.microsoft.com/azure/cosmos-db/free-tier)
- [Serverless Mode](https://docs.microsoft.com/azure/cosmos-db/serverless)

---

## ✅ Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Choose storage type (file or cosmos)
- [ ] Configure `.env` file
- [ ] Start server: `npm run server:dev`
- [ ] Test conversation with threadId
- [ ] Verify storage (check memory/ folder or Azure Portal)
- [ ] Deploy to production with Cosmos DB

Happy coding! 🎉
