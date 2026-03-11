# UpVotr SDK

TypeScript SDK for the [UpVotr](https://upvotr.vercel.app) REST API — Reddit marketing automation.

## Install

```bash
# From GitHub
npm install Westy8/upvotr-sdk

# Or copy index.ts directly into your project
```

## Quick Start

```typescript
import { UpVotr } from 'upvotr-sdk'

const client = new UpVotr({
  apiKey: process.env.UPVOTR_API_KEY!,
  // baseUrl defaults to https://upvotr.vercel.app/api/v1
})

// Get dashboard overview
const dashboard = await client.dashboard.overview()
console.log(dashboard.data)

// List Reddit accounts
const accounts = await client.accounts.list()

// List posts sorted by score
const posts = await client.posts.list({ sort: 'score', order: 'desc', per_page: 50 })

// Upload media
const file = new File([buffer], 'photo.jpg', { type: 'image/jpeg' })
const media = await client.media.uploadFile(file, { title: 'My photo' })

// Generate AI captions for a subreddit
const captions = await client.captions.generate({
  subreddit_name: 'pics',
  count: 5,
})

// Create a scheduled post
await client.schedule.create({
  scheduled_date: '2026-03-15',
  scheduled_time: '14:00',
  title: 'My post title',
  reddit_account_id: accounts.data[0].id,
  media_id: media.data.id,
})
```

## Authentication

1. Log into [UpVotr](https://upvotr.vercel.app)
2. Go to **Billing** > **API Keys**
3. Click **New Key**, name it, click **Create**
4. Copy the `upv_...` key (shown only once)

```bash
export UPVOTR_API_KEY=upv_your_key_here
```

## API Resources

| Resource | Methods | Description |
|---|---|---|
| `client.accounts` | `list`, `create`, `retrieve`, `update`, `delete`, `subreddits`, `sync` | Reddit account management |
| `client.posts` | `list`, `retrieve`, `sync`, `log` | Cached Reddit posts |
| `client.media` | `list`, `uploadFile`, `retrieve`, `update`, `delete`, `describe`, `spoof`, `download`, `move`, `describeBulk`, `importFromPosts` | Media management & AI |
| `client.folders` | `list`, `create`, `update`, `delete` | Media folder organization |
| `client.captions` | `list`, `create`, `retrieve`, `update`, `delete`, `generate`, `inspirations`, `toggleInspirationFavorite` | AI captions |
| `client.schedule` | `list`, `create`, `retrieve`, `update`, `delete`, `generate` | Content scheduling |
| `client.posting` | `availability`, `getSettings`, `updateSettings`, `subredditHistory` | Posting availability & settings |
| `client.subreddits` | `list`, `create`, `retrieve`, `update`, `delete`, `sync`, `lookupInfo`, `lookupTop` | Subreddit tracking |
| `client.discovery` | `createSession`, `getSession`, `getCards`, `swipe`, `fetchMore` | Subreddit discovery |
| `client.watchlist` | `list`, `add`, `retrieve`, `delete`, `addToTracking` | Discovery watchlist |
| `client.warmup` | `list`, `add`, `retrieve`, `delete`, `scrape`, `getSop`, `generateSop`, `exportSop`, `getTimeline` | Account warmup analysis |
| `client.dashboard` | `overview`, `stats` | Analytics |
| `client.user` | `plan`, `listKeys`, `createKey`, `revokeKey` | Plan & API key management |

## Response Format

All methods return an `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: { page?: number; per_page?: number; total?: number; total_pages?: number }
}
```

## Error Handling

Failed requests throw `UpVotrError`:

```typescript
import { UpVotrError } from 'upvotr-sdk'

try {
  await client.accounts.retrieve('nonexistent-id')
} catch (err) {
  if (err instanceof UpVotrError) {
    console.log(err.code)    // 'NOT_FOUND'
    console.log(err.status)  // 404
    console.log(err.message) // 'Account not found'
  }
}
```

## Pagination

Paginated endpoints accept `page` and `per_page`:

```typescript
const page1 = await client.posts.list({ page: 1, per_page: 50 })
console.log(page1.meta) // { page: 1, per_page: 50, total: 5163, total_pages: 104 }
```

## OpenAPI Spec

The full OpenAPI 3.1.0 specification is included as [`openapi.json`](./openapi.json) and served at:

```
https://upvotr.vercel.app/openapi.json
```

Import it into Postman, Insomnia, or use it to generate clients in any language:

```bash
# Generate a Python client
npx @openapitools/openapi-generator-cli generate -i openapi.json -g python -o ./python-client

# Generate types only
npx openapi-typescript openapi.json -o upvotr-types.d.ts
```

## Low-Level Requests

For endpoints not covered by a resource method:

```typescript
const response = await client.request<MyType>('POST', '/some/path', {
  body: { key: 'value' },
  params: { page: 1 },
})
```

## License

MIT
