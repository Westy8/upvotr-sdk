/**
 * UpVotr TypeScript SDK
 *
 * Lightweight client for the UpVotr public REST API.
 * Works in Node.js, Deno, Bun, and modern browsers.
 *
 * Usage:
 *   import { UpVotr } from './sdk'
 *   const client = new UpVotr({ apiKey: 'upv_...' })
 *   const dashboard = await client.dashboard.get()
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UpVotrConfig {
  apiKey: string
  baseUrl?: string // defaults to https://upvotr.vercel.app/api/v1
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: ApiMeta
}

export interface ApiMeta {
  page?: number
  per_page?: number
  total?: number
  total_pages?: number
  [key: string]: unknown
}

export interface PaginationParams {
  page?: number
  per_page?: number
}

// ─── Resource Types ─────────────────────────────────────────────────────────

export interface Account {
  id: string
  username: string
  karma_score: number
  post_karma: number
  comment_karma: number
  is_suspended: boolean
  is_verified: boolean
  account_age_days: number
  cake_day: string
  fetched_at: string
  created_at: string
}

export interface AccountGroup {
  id: string
  name: string
  color: string | null
  media_folder_id: string | null
  member_count: number
  member_ids: string[]
  created_at: string
  updated_at: string
}

export interface AccountGroupMemberPreview {
  id: string
  username: string
  is_suspended: boolean
}

export interface AccountGroupWithMembers extends Omit<AccountGroup, 'member_ids'> {
  members: AccountGroupMemberPreview[]
}

export interface Post {
  id: string
  reddit_account_id: string
  reddit_post_id: string
  title: string
  selftext: string
  subreddit: string
  score: number
  upvote_ratio: number
  num_comments: number
  created_utc: number
  permalink: string
  thumbnail: string
  is_nsfw: boolean
  is_video: boolean
  is_gallery: boolean
  removed_by_category: string | null
  cached_at: string
}

export interface MediaItem {
  id: string
  type: 'image' | 'redgif' | 'video'
  title: string
  tags: string[]
  storage_path: string
  thumbnail_url: string
  external_url: string | null
  ai_description: string | null
  folder_id: string | null
  created_at: string
}

export interface MediaFolder {
  id: string
  parent_id: string | null
  name: string
  color: string
  sort_order: number
  created_at: string
}

export interface Caption {
  id: string
  content: string
  tags: string[]
  created_at: string
}

export interface ScheduleEntry {
  id: string
  scheduled_date: string
  scheduled_time: string
  title: string
  /**
   * Reddit post-flair text the row will be tagged with. AI generation
   * stamps the best-fit flair from the target subreddit's top posts;
   * users can override via the UpVotr dashboard. Null when the subreddit
   * has no usable flairs or when no flair was selected.
   */
  flair_text: string | null
  /**
   * Reddit's UUID for the chosen flair template. Provide this to Reddit's
   * submit endpoint when posting; `flair_text` is for human display and
   * fallback. Null when not picked or unknown.
   */
  flair_template_id: string | null
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled'
  reddit_account_id: string
  media_id: string | null
  subreddit_id: string | null
  selected_subreddits: string[]
  source: 'manual' | 'ai'
  created_at: string
}

export interface Subreddit {
  id: string
  name: string
  is_nsfw: boolean
  subscriber_count: number
  description: string | null
  rules: Record<string, unknown> | null
  reddit_account_id: string | null
  created_at: string
}

export interface WatchlistItem {
  id: string
  subreddit_name: string
  reddit_account_id: string | null
  notes: string | null
  created_at: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

// ─── Error ──────────────────────────────────────────────────────────────────

export class UpVotrError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public meta?: ApiMeta
  ) {
    super(message)
    this.name = 'UpVotrError'
  }
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class UpVotr {
  private baseUrl: string
  private apiKey: string

  readonly accounts: AccountsResource
  readonly accountGroups: AccountGroupsResource
  readonly posts: PostsResource
  readonly media: MediaResource
  readonly folders: FoldersResource
  readonly captions: CaptionsResource
  readonly schedule: ScheduleResource
  readonly posting: PostingResource
  readonly subreddits: SubredditsResource
  readonly discovery: DiscoveryResource
  readonly watchlist: WatchlistResource
  readonly warmup: WarmupResource
  readonly dashboard: DashboardResource
  readonly user: UserResource

  constructor(config: UpVotrConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl || 'https://upvotr.vercel.app/api/v1').replace(/\/$/, '')

    this.accounts = new AccountsResource(this)
    this.accountGroups = new AccountGroupsResource(this)
    this.posts = new PostsResource(this)
    this.media = new MediaResource(this)
    this.folders = new FoldersResource(this)
    this.captions = new CaptionsResource(this)
    this.schedule = new ScheduleResource(this)
    this.posting = new PostingResource(this)
    this.subreddits = new SubredditsResource(this)
    this.discovery = new DiscoveryResource(this)
    this.watchlist = new WatchlistResource(this)
    this.warmup = new WarmupResource(this)
    this.dashboard = new DashboardResource(this)
    this.user = new UserResource(this)
  }

  /** Low-level request method. Prefer the resource methods. */
  async request<T = unknown>(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string | number | boolean | undefined>; formData?: FormData }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (options?.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined) url.searchParams.set(k, String(v))
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    }

    let fetchBody: string | FormData | undefined
    if (options?.formData) {
      fetchBody = options.formData
    } else if (options?.body) {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(options.body)
    }

    const res = await fetch(url.toString(), { method, headers, body: fetchBody })
    const json = (await res.json()) as ApiResponse<T>

    if (!json.success) {
      throw new UpVotrError(
        json.error?.code || 'UNKNOWN',
        json.error?.message || 'Unknown error',
        res.status,
        json.meta
      )
    }
    return json
  }
}

// ─── Resource Base ──────────────────────────────────────────────────────────

class Resource {
  constructor(protected client: UpVotr) {}

  protected get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.client.request<T>('GET', path, { params })
  }
  protected post<T>(path: string, body?: unknown) {
    return this.client.request<T>('POST', path, { body })
  }
  protected patch<T>(path: string, body?: unknown) {
    return this.client.request<T>('PATCH', path, { body })
  }
  protected put<T>(path: string, body?: unknown) {
    return this.client.request<T>('PUT', path, { body })
  }
  protected del<T>(path: string) {
    return this.client.request<T>('DELETE', path)
  }
  protected upload<T>(path: string, formData: FormData) {
    return this.client.request<T>('POST', path, { formData })
  }
}

// ─── Accounts ───────────────────────────────────────────────────────────────

class AccountsResource extends Resource {
  list(params?: PaginationParams) {
    return this.get<Account[]>('/accounts', params as Record<string, string | number | boolean | undefined>)
  }
  create(username: string, options?: { group_id?: string }) {
    return this.post<Account>('/accounts', { username, ...(options || {}) })
  }
  retrieve(id: string) {
    return this.get<Account>(`/accounts/${id}`)
  }
  update(id: string, data: { username?: string }) {
    return this.patch<Account>(`/accounts/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/accounts/${id}`)
  }
  subreddits(id: string) {
    return this.get<Subreddit[]>(`/accounts/${id}/subreddits`)
  }
  sync(id: string) {
    return this.post<{ posts_synced: number }>(`/accounts/${id}/sync`)
  }
}

// ─── Account Groups ──────────────────────────────────────────────────────────

class AccountGroupsResource extends Resource {
  list(params?: PaginationParams) {
    return this.get<AccountGroup[]>('/account-groups', params as Record<string, string | number | boolean | undefined>)
  }
  create(data: {
    name: string
    account_ids: string[]
    color?: string | null
    media_folder_id?: string | null
  }) {
    return this.post<AccountGroup>('/account-groups', data)
  }
  retrieve(id: string) {
    return this.get<AccountGroupWithMembers>(`/account-groups/${id}`)
  }
  update(id: string, data: {
    name?: string
    color?: string | null
    account_ids?: string[]
    media_folder_id?: string | null
  }) {
    return this.patch<AccountGroupWithMembers>(`/account-groups/${id}`, data)
  }
  delete(id: string) {
    return this.del<{ id: string; deleted: true }>(`/account-groups/${id}`)
  }
}

// ─── Posts ───────────────────────────────────────────────────────────────────

class PostsResource extends Resource {
  list(params?: PaginationParams & {
    account_id?: string
    subreddit?: string
    sort?: 'created_utc' | 'score' | 'num_comments' | 'cached_at'
    order?: 'asc' | 'desc'
  }) {
    return this.get<Post[]>('/posts', params as Record<string, string | number | boolean | undefined>)
  }
  retrieve(id: string) {
    return this.get<Post>(`/posts/${id}`)
  }
  sync(accountId?: string) {
    return this.post('/posts/sync', accountId ? { account_id: accountId } : {})
  }
  log(params?: PaginationParams & { subreddit_id?: string; account_id?: string }) {
    return this.get('/posts/log', params as Record<string, string | number | boolean | undefined>)
  }
}

// ─── Media ──────────────────────────────────────────────────────────────────

class MediaResource extends Resource {
  list(params?: PaginationParams & { folder_id?: string; type?: 'image' | 'redgif' | 'video'; search?: string }) {
    return this.get<MediaItem[]>('/media', params as Record<string, string | number | boolean | undefined>)
  }
  uploadFile(file: File | Blob, options?: { title?: string; folder_id?: string }) {
    const fd = new FormData()
    fd.append('file', file)
    if (options?.title) fd.append('title', options.title)
    if (options?.folder_id) fd.append('folder_id', options.folder_id)
    return this.client.request<MediaItem>('POST', '/media/upload', { formData: fd })
  }
  retrieve(id: string) {
    return this.get<MediaItem>(`/media/${id}`)
  }
  update(id: string, data: { title?: string; tags?: string[]; folder_id?: string | null }) {
    return this.patch<MediaItem>(`/media/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/media/${id}`)
  }
  describe(id: string) {
    return this.post<{ description: string }>(`/media/${id}/describe`)
  }
  spoof(id: string) {
    return this.post(`/media/${id}/spoof`)
  }
  download(id: string) {
    return this.get<{ url: string }>(`/media/${id}/download`)
  }
  move(mediaIds: string[], folderId?: string | null) {
    return this.post('/media/move', { media_ids: mediaIds, folder_id: folderId ?? null })
  }
  describeBulk(options: { media_ids?: string[]; scope?: 'all' | 'uncategorized' | 'folder'; folder_id?: string; only_missing?: boolean }) {
    return this.post('/media/describe/bulk', options)
  }
  importFromPosts(options?: { filter_subreddit?: string; limit?: number }) {
    return this.post('/media/import-from-posts', options || {})
  }
}

// ─── Folders ────────────────────────────────────────────────────────────────

class FoldersResource extends Resource {
  list() {
    return this.get<MediaFolder[]>('/media/folders')
  }
  create(data: { name: string; parent_id?: string; color?: string }) {
    return this.post<MediaFolder>('/media/folders', data)
  }
  update(id: string, data: { name?: string; color?: string }) {
    return this.patch<MediaFolder>(`/media/folders/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/media/folders/${id}`)
  }
}

// ─── Captions ───────────────────────────────────────────────────────────────

class CaptionsResource extends Resource {
  list(params?: PaginationParams & { tag?: string }) {
    return this.get<Caption[]>('/captions', params as Record<string, string | number | boolean | undefined>)
  }
  create(data: { content: string; tags?: string[] }) {
    return this.post<Caption>('/captions', data)
  }
  retrieve(id: string) {
    return this.get<Caption>(`/captions/${id}`)
  }
  update(id: string, data: { content?: string; tags?: string[] }) {
    return this.patch<Caption>(`/captions/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/captions/${id}`)
  }
  generate(options: {
    subreddit_name: string
    reddit_account_username?: string
    media_id?: string
    media_ids?: string[]
    count?: number
    use_subreddit_posts?: boolean
    use_account_posts?: boolean
    use_subreddit_rules?: boolean
    use_media_context?: boolean
    allow_media_description_generation?: boolean
    use_nsfw_language?: boolean
  }) {
    return this.post('/captions/generate', options)
  }
  inspirations(params?: PaginationParams & { subreddit?: string; favorite?: 'true' | 'false'; sort?: 'score' | 'times_used' }) {
    return this.get('/captions/inspirations', params as Record<string, string | number | boolean | undefined>)
  }
  toggleInspirationFavorite(id: string, isFavorite: boolean) {
    return this.patch('/captions/inspirations', { id, is_favorite: isFavorite })
  }
}

// ─── Schedule ───────────────────────────────────────────────────────────────

class ScheduleResource extends Resource {
  list(params?: PaginationParams & {
    status?: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled'
    date?: string
    account_id?: string
    source?: 'manual' | 'ai'
  }) {
    return this.get<ScheduleEntry[]>('/schedule', params as Record<string, string | number | boolean | undefined>)
  }
  create(data: {
    scheduled_date: string
    title: string
    scheduled_time?: string
    status?: 'draft' | 'scheduled'
    reddit_account_id?: string
    media_id?: string
    subreddit_id?: string
    selected_subreddits?: string[]
    source?: string
    /** Reddit post-flair text. Pass null to clear. */
    flair_text?: string | null
    /** Reddit flair template UUID, if known. */
    flair_template_id?: string | null
  }) {
    return this.post<ScheduleEntry>('/schedule', data)
  }
  retrieve(id: string) {
    return this.get<ScheduleEntry>(`/schedule/${id}`)
  }
  update(id: string, data: Partial<Omit<ScheduleEntry, 'id' | 'created_at'>>) {
    return this.patch<ScheduleEntry>(`/schedule/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/schedule/${id}`)
  }
  generate(options: {
    reddit_account_id: string
    posts_per_day: number
    start_time: string
    end_time: string
    spacing_minutes: number
    timezone?: string
    start_date?: string
    scope?: 'window' | 'day'
    target_date?: string
    apply_mode?: 'replace' | 'add'
    use_nsfw_language?: boolean
  }) {
    return this.post('/schedule/generate', options)
  }
}

// ─── Posting ────────────────────────────────────────────────────────────────

class PostingResource extends Resource {
  availability(accountId?: string) {
    return this.get('/posting/availability', accountId ? { account_id: accountId } : undefined)
  }
  getSettings() {
    return this.get('/posting/settings')
  }
  updateSettings(data: {
    subreddit_cooldown_hours?: number
    content_cooldown_days?: number
    score_tier_low?: number
    score_tier_mid?: number
    score_tier_high?: number
  }) {
    return this.put('/posting/settings', data)
  }
  subredditHistory(accountId: string, subreddit: string) {
    return this.get('/posting/subreddit-history', { account_id: accountId, subreddit })
  }
}

// ─── Subreddits ─────────────────────────────────────────────────────────────

class SubredditsResource extends Resource {
  list(params?: PaginationParams & { search?: string; reddit_account_id?: string }) {
    return this.get<Subreddit[]>('/subreddits', params as Record<string, string | number | boolean | undefined>)
  }
  create(data: { name: string; reddit_account_id?: string; is_nsfw?: boolean; subscriber_count?: number; description?: string }) {
    return this.post<Subreddit>('/subreddits', data)
  }
  retrieve(id: string) {
    return this.get<Subreddit>(`/subreddits/${id}`)
  }
  update(id: string, data: { notes?: string; is_nsfw?: boolean; description?: string }) {
    return this.patch<Subreddit>(`/subreddits/${id}`, data)
  }
  delete(id: string) {
    return this.del(`/subreddits/${id}`)
  }
  sync(subredditNames: string[]) {
    return this.post('/subreddits/sync', { subreddit_names: subredditNames })
  }
  lookupInfo(name: string) {
    return this.get(`/subreddits/lookup/${encodeURIComponent(name)}/info`)
  }
  lookupTop(name: string, params?: { time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'; limit?: number }) {
    return this.get(`/subreddits/lookup/${encodeURIComponent(name)}/top`, params as Record<string, string | number | boolean | undefined>)
  }
}

// ─── Discovery ──────────────────────────────────────────────────────────────

class DiscoveryResource extends Resource {
  createSession(data: { reddit_account_id: string; filters?: Record<string, unknown>; resume_session_id?: string; start_fresh?: boolean }) {
    return this.post('/discovery/sessions', data)
  }
  getSession(id: string) {
    return this.get(`/discovery/sessions/${id}`)
  }
  getCards(id: string, count?: number) {
    return this.get(`/discovery/sessions/${id}/cards`, count ? { count } : undefined)
  }
  swipe(sessionId: string, data: { discovered_subreddit_id: string; action: 'like' | 'skip'; skip_reason?: string }) {
    return this.post(`/discovery/sessions/${sessionId}/swipe`, data)
  }
  fetchMore(sessionId: string) {
    return this.post(`/discovery/sessions/${sessionId}/fetch-more`)
  }
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

class WatchlistResource extends Resource {
  list(params?: PaginationParams & { reddit_account_id?: string }) {
    return this.get<WatchlistItem[]>('/watchlist', params as Record<string, string | number | boolean | undefined>)
  }
  add(data: { subreddit_name: string; reddit_account_id?: string; notes?: string }) {
    return this.post<WatchlistItem>('/watchlist', data)
  }
  retrieve(id: string) {
    return this.get<WatchlistItem>(`/watchlist/${id}`)
  }
  delete(id: string) {
    return this.del(`/watchlist/${id}`)
  }
  addToTracking(id: string) {
    return this.post(`/watchlist/${id}/add-to-tracking`)
  }
}

// ─── Warmup ─────────────────────────────────────────────────────────────────

class WarmupResource extends Resource {
  list(params?: PaginationParams & { search?: string; sort?: 'created' | 'karma' | 'scraped'; order?: 'asc' | 'desc' }) {
    return this.get('/warmup/accounts', params as Record<string, string | number | boolean | undefined>)
  }
  add(username: string) {
    return this.post('/warmup/accounts', { username })
  }
  retrieve(id: string) {
    return this.get(`/warmup/accounts/${id}`)
  }
  delete(id: string) {
    return this.del(`/warmup/accounts/${id}`)
  }
  scrape(id: string) {
    return this.post(`/warmup/accounts/${id}/scrape`)
  }
  getSop(id: string) {
    return this.get(`/warmup/accounts/${id}/sop`)
  }
  generateSop(id: string) {
    return this.post(`/warmup/accounts/${id}/sop`)
  }
  exportSop(id: string) {
    return this.get<string>(`/warmup/accounts/${id}/sop/export`)
  }
  getTimeline(id: string) {
    return this.get(`/warmup/accounts/${id}/timeline`)
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

class DashboardResource extends Resource {
  overview(accountId?: string) {
    return this.client.request('GET', '/dashboard', { params: accountId ? { account_id: accountId } : undefined })
  }
  stats(params?: { days?: number; account_id?: string }) {
    return this.client.request('GET', '/dashboard/stats', { params: params as Record<string, string | number | boolean | undefined> })
  }
}

// ─── User ───────────────────────────────────────────────────────────────────

class UserResource extends Resource {
  plan() {
    return this.get('/user/plan')
  }
  listKeys() {
    return this.get<ApiKey[]>('/user/keys')
  }
  createKey(name: string, expiresInDays?: number) {
    return this.post<ApiKey & { key: string }>('/user/keys', { name, expires_in_days: expiresInDays })
  }
  revokeKey(id: string) {
    return this.del(`/user/keys/${id}`)
  }
}
