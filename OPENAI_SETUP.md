# OpenAI API Integration Setup Guide

## 🔐 Secure API Key Management

### 1. Get Your OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key immediately (you won't see it again)

### 2. Local Development Setup

#### Option A: Environment Variables (Recommended)

1. Create a `.env.local` file in your project root:
\`\`\`bash
# .env.local
OPENAI_API_KEY=sk-your-actual-api-key-here
\`\`\`

2. Add `.env.local` to your `.gitignore` (should already be there):
\`\`\`bash
# .gitignore
.env.local
.env*.local
\`\`\`

3. Restart your development server after adding the key

#### Option B: Vercel CLI (For Vercel deployment)

\`\`\`bash
# Set environment variable via Vercel CLI
vercel env add OPENAI_API_KEY
# Enter your API key when prompted
# Select all environments (development, preview, production)
\`\`\`

### 3. Production Deployment

#### Vercel Dashboard Method:
1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Environments**: Select Production (and Preview if needed)
4. Redeploy your application

#### Other Platforms:
- **Netlify**: Site settings → Environment variables
- **Railway**: Variables tab in your project
- **Heroku**: Settings → Config Vars
- **AWS/GCP/Azure**: Use their respective secret management services

### 4. Security Best Practices

#### ✅ DO:
- Store API keys in environment variables only
- Use different keys for development/production if possible
- Set up API key usage limits in OpenAI dashboard
- Monitor API usage regularly
- Rotate keys periodically
- Use server-side API routes only (never expose keys to client)

#### ❌ DON'T:
- Commit API keys to version control
- Share keys in chat/email/documentation
- Use production keys in development
- Store keys in client-side code
- Use keys without usage limits

### 5. Usage Monitoring & Limits

1. **Set Usage Limits** in OpenAI Dashboard:
   - Go to **Billing** → **Usage limits**
   - Set monthly spending limit (e.g., $20/month)
   - Set up email alerts at 75% and 90%

2. **Monitor Usage**:
   - Check **Usage** tab regularly
   - Track costs per model (GPT-4 vs GPT-3.5)
   - Monitor request patterns

### 6. Cost Optimization

#### Model Selection:
- **GPT-4o-mini**: Most cost-effective for grammar checking (~$0.15/1M tokens)
- **GPT-4o**: Higher quality but more expensive (~$2.50/1M tokens)
- **GPT-3.5-turbo**: Good balance (~$0.50/1M tokens)

#### Implementation Tips:
\`\`\`typescript
// Optimize token usage
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini", // Use cost-effective model
  messages: [...],
  max_tokens: 1000,     // Limit response length
  temperature: 0.1,     // Low temperature for consistent results
})
\`\`\`

#### Rate Limiting:
\`\`\`typescript
// Add rate limiting to prevent abuse
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: upstashRedis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
})
\`\`\`

### 7. Fallback Strategy

The application includes a fallback mechanism:

\`\`\`typescript
// If OpenAI fails, fall back to mock grammar checker
try {
  suggestions = await analyzeTextWithAI(content)
} catch (aiError) {
  console.error('AI analysis failed, falling back to mock:', aiError)
  suggestions = generateSuggestions(content) // Mock implementation
}
\`\`\`

### 8. Testing the Integration

1. **Test API Key**:
\`\`\`bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
\`\`\`

2. **Test in Application**:
   - Create a document
   - Add some text with intentional errors
   - Check if AI suggestions appear
   - Monitor browser console for errors

### 9. Troubleshooting

#### Common Issues:

**"Invalid API Key"**
- Verify key is correctly set in environment variables
- Check for extra spaces or characters
- Ensure key starts with `sk-`

**"Rate limit exceeded"**
- Check OpenAI dashboard for usage limits
- Implement client-side rate limiting
- Consider upgrading OpenAI plan

**"Insufficient quota"**
- Add billing information to OpenAI account
- Check usage limits and increase if needed
- Monitor spending to avoid unexpected charges

**API calls not working**
- Verify environment variable name matches exactly
- Restart development server after adding env vars
- Check server logs for detailed error messages

### 10. Environment Variable Verification

Add this to your API route for debugging (remove in production):

\`\`\`typescript
// Temporary debug code - REMOVE IN PRODUCTION
console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY)
console.log('Key starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'))
\`\`\`

---

## 🚀 Quick Start Checklist

- [ ] Get OpenAI API key from platform.openai.com
- [ ] Add `OPENAI_API_KEY=sk-...` to `.env.local`
- [ ] Restart development server
- [ ] Test grammar checking in the app
- [ ] Set usage limits in OpenAI dashboard
- [ ] Deploy with environment variable configured
- [ ] Monitor usage and costs

---

**⚠️ Security Reminder**: Never commit your API key to version control. Always use environment variables and keep your keys secure!
