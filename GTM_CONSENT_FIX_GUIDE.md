# GTM Consent Management Configuration Guide

## Issue Resolved

✅ **Duplicate cookie consent banners fixed** - Fallback banner disabled in code

## Next Steps: Configure GTM Consent Management

### Access GTM

1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Open container: **GTM-KBBFHBSK**
3. Create new workspace: "Consent Management Fix"

### Step 1: Install Consent Template

1. Go to **Templates** → **Search Gallery**
2. Search for one of these options:
   - "Cookiebot CMP" (recommended, free tier available)
   - "OneTrust Cookie Consent"
   - "CookieYes GDPR Cookie Consent"
3. Click **Add to workspace**

### Step 2: Create Consent Initialization Tag

1. Go to **Tags** → **New**
2. Name: "Consent Management - Initialize"
3. Tag Configuration:
   - Choose your installed consent template
   - Set default consent state:
     - `analytics_storage`: denied
     - `ad_storage`: denied
     - `functionality_storage`: denied
     - `security_storage`: granted
4. Triggering: **Consent Initialization - All Pages**
5. Save

### Step 3: Update GA4 Configuration Tag

1. Find existing tag: "GA4 Configuration"
2. Click to edit
3. Go to **Advanced Settings** → **Consent Settings**
4. Add required consent types:
   - Check "Require additional consent for tag to fire"
   - Add: `analytics_storage` = granted
5. Save

### Step 4: Create Consent Update Listener

1. Go to **Tags** → **New**
2. Name: "Consent Management - Update Handler"
3. Tag Configuration:
   - Custom HTML tag
   ```javascript
   <script>
   (function() {
     // Listen for consent updates from your CMP
     window.addEventListener('consent_update', function(e) {
       window.dataLayer.push({
         'event': 'consent_update',
         'analytics_storage': e.detail.analytics ? 'granted' : 'denied',
         'ad_storage': e.detail.marketing ? 'granted' : 'denied'
       });
     });
   })();
   </script>
   ```
4. Triggering: **All Pages**
5. Save

### Step 5: Test Configuration

1. Click **Preview** button
2. Enter website URL: `https://www.llmtxtmastery.com`
3. Verify:
   - Only ONE consent banner appears
   - GA4 doesn't fire until consent granted
   - Consent choices are respected

### Step 6: Publish Changes

1. Click **Submit** button
2. Version name: "Consent Management Fix"
3. Description: "Fixed duplicate consent banners, implemented proper consent mode"
4. Click **Publish**

## Verification Checklist

- [ ] Only one consent banner appears on page load
- [ ] Banner appears at bottom of page
- [ ] "Accept All" enables analytics tracking
- [ ] "Necessary Only" blocks analytics
- [ ] GA4 respects consent choices
- [ ] No console errors related to consent

## Alternative: Free Consent Solution

If you don't want to use a paid service, consider:

### Option 1: Cookiebot (Free for <100 pages)

1. Sign up at [cookiebot.com](https://www.cookiebot.com)
2. Get your Domain Group ID
3. Use Cookiebot GTM template
4. Free tier includes full GDPR compliance

### Option 2: Simple GTM Consent Banner

1. Create custom HTML tag with basic banner
2. Store consent in localStorage
3. Push consent updates to dataLayer
4. Fully free but requires more setup

## Support Resources

- [GTM Consent Mode Documentation](https://support.google.com/tagmanager/answer/10718549)
- [GA4 Consent Mode](https://support.google.com/analytics/answer/9976101)
- [Cookiebot GTM Guide](https://www.cookiebot.com/en/google-tag-manager/)

## Status

✅ **Code Fix Complete** - Fallback banner disabled
⏳ **GTM Configuration Pending** - Follow steps above
📊 **Testing Required** - Verify single banner after GTM update
