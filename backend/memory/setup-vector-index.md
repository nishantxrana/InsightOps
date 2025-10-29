# MongoDB Atlas Vector Search Setup

## Prerequisites
- MongoDB Atlas account (free tier)
- Database already created

## Steps to Enable Vector Search

### Option 1: Atlas UI (Recommended)

1. **Go to Atlas Dashboard**
   - Navigate to your cluster
   - Click "Search" tab
   - Click "Create Search Index"

2. **Select JSON Editor**
   - Choose "JSON Editor" option
   - Select database: `your-database-name`
   - Select collection: `memories`

3. **Paste This Index Definition**

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 384,
        "similarity": "cosine"
      },
      "type": {
        "type": "string"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

4. **Name the Index**
   - Index name: `vector_index`
   - Click "Create Search Index"

5. **Wait for Index to Build**
   - Status will change from "Building" to "Active"
   - Usually takes 1-2 minutes

### Option 2: MongoDB Shell (mongosh)

```javascript
db.memories.createSearchIndex(
  "vector_index",
  "vectorSearch",
  {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 384,
        similarity: "cosine"
      },
      {
        type: "filter",
        path: "type"
      },
      {
        type: "filter",
        path: "createdAt"
      }
    ]
  }
);
```

## Verify Setup

Run this in mongosh to check if index exists:

```javascript
db.memories.getSearchIndexes();
```

Should return:
```json
[
  {
    "id": "...",
    "name": "vector_index",
    "type": "vectorSearch",
    "status": "READY",
    ...
  }
]
```

## Test Vector Search

```javascript
// Insert test memory
db.memories.insertOne({
  content: "npm install failed due to missing package.json",
  embedding: [0.1, 0.2, ...], // 384 dimensions
  metadata: { type: "build_failure" },
  type: "build_failure",
  accessCount: 0,
  createdAt: new Date()
});

// Test vector search
db.memories.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: [0.1, 0.2, ...], // 384 dimensions
      numCandidates: 100,
      limit: 5
    }
  },
  {
    $project: {
      content: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
]);
```

## Troubleshooting

### Index Not Found Error
- Verify index name is exactly `vector_index`
- Check index status is "Active" not "Building"
- Ensure collection name is `memories`

### Dimension Mismatch
- Embedding must be exactly 384 dimensions
- Using sentence-transformers/all-MiniLM-L6-v2 model
- Verify Hugging Face API returns correct dimensions

### No Results
- Ensure documents have `embedding` field
- Check embedding is array of numbers, not string
- Verify queryVector has same dimensions as stored embeddings

## Free Tier Limits

MongoDB Atlas Free Tier (M0):
- ✅ Vector Search: Supported
- ✅ Storage: 512MB
- ✅ Indexes: Unlimited
- ✅ Vector dimensions: Up to 2048
- ✅ Cost: $0

## Performance Tips

1. **Limit Results**: Use `limit` parameter (default: 5)
2. **Filter First**: Use metadata filters before vector search
3. **Cache Embeddings**: Cache in memory to avoid regeneration
4. **Cleanup Old**: Delete unused memories regularly

## Next Steps

After setup:
1. Run `node test-phase3.js` to test
2. Check logs for "Vector search completed"
3. Monitor memory usage in Atlas dashboard
4. Adjust cleanup schedule if needed
