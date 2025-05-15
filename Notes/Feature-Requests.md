(Requested features & Ideas)
Prioritize them with High (must-have), Medium (nice-to-have), and Low (low-priority)

# 05-13  
Would you like help building a mini form to let users edit their businessProfile info (name, logo, description)?

Next Suggestions:
Add a Firebase Cloud Function to notify admins when a new business application is submitted

Create an AdminDashboardScreen to review and approve/reject these

Optionally, show application status (pending, rejected, approved) under the user’s profile

Optional Enhancements
🔍 1. Add Discoverability
Show verified businesses in a “Featured Businesses” section

Allow users to “Follow” business channels

Add search filters: category, location, recent activity

🔗 2. Deep Linking
Allow external links to interzone://channel/{uid} or interzone.com/@{businessHandle}

👁️ 3. Business Post Badging
Inside the post feed, if a post comes from a businessVerified user, show a small verified icon or category tag (Restaurant, Music, etc.).

# 05-12 Business Account Feature
Option A
Phase 1: Public Business Channel
Let each business have its own public page, accessible by anyone via a username or profile link.

Features:
Business avatar, name, description

Verified badge if applicable

A media feed (posts: images, videos, promos, etc.)

Optional category tag (e.g., “Restaurant”)

Contact options: phone, email, website/social

🔧 Technical:
Create a new screen: BusinessChannelScreen.tsx

Navigate to it from:

Post by that business

Search result

Tapping their avatar

 Phase 2: Business-only Post Feed
Let business users manage their channel feed from their profile.

Features:
Toggle for showing only business posts on their profile

"Create New Promo Post" button (images/videos with tags)

Optional post scheduling (future idea)

🔹 Phase 3: Followers & Messaging
Let users follow business profiles or receive updates.

Features:
"Follow" button on business channel

Notification system when the business posts new content

Optionally: allow DM between users and businesses

Bonus Ideas
✅ Let verified businesses get a unique @handle or slug (interzone.com/@mariasempanadas)

🎯 Show category filters on Business Channel (e.g., “Menu,” “Events,” “Promotions”)

🏆 Add “Top Businesses in Your City” on HomeScreen


Option B
### 📝 Summary
Introduce a distinct "Business" account type in InterZone to support local commerce, improve content trustworthiness, and offer potential monetization pathways. This separates regular users from businesses and unlocks specialized functionality.

---

### 🔁 Phase 1 – Business Account Structure
- Add `accountType` field to Firestore user document: `"individual"` or `"business"`
- Update onboarding or settings to allow users to select or switch account type
- Add business-specific profile fields:
  - Business Name
  - Category (e.g., restaurant, musician, tutoring)
  - Description
  - Business logo/image
  - Contact info (phone, email, social links)
  - Business hours
- Require verification (QR Code system) for business accounts
- Display a verified badge on business profiles

---

### 📊 Phase 2 – Business Dashboard (MVP)
- Show basic analytics: views, likes, comments per post
- Allow businesses to:
  - Moderate comments
  - Highlight or pin one post at a time
- UI changes for business profiles (e.g., badge, layout emphasis)

---

### 💸 Phase 3 – Premium Business Features (Optional Monetization)
- Priority listing in search results
- Featured business badge or highlight in feed
- Promote posts city-wide (ads-lite)
- In-app booking/contact requests
- Analytics on reach & engagement

---

### 🔒 Notes on Implementation
- Firestore Rule: Restrict some write actions by account type
- Admin-only control for verified status
- Conditional UI rendering depending on `accountType`

---


# 4-04
1. Recuperar contrasenia, compartir y comentarios.

# 4-03
1. User Personalization and Settings
Allow users to customize themes or set preferences for how they view the app, including dark mode.

Implement user profile customization where users can edit their details, change avatars, and manage settings. (Done)

2. Advanced Filtering and Sorting Options
Provide more sophisticated filters (e.g., by date range, user ratings, tags).

Offer sorting options like alphabetical, popularity, recent activity, etc.

3. Social Features
Enhance community engagement by adding features like comments, shares, or a forum where users can discuss posts.

Implement a notification system to alert users about new posts in categories they follow or updates on discussions they are part of.

4. Analytics and Feedback
Integrate analytics to track user behavior and popular content, which can inform your feature enhancements.

Add a feedback system where users can report issues or suggest improvements.

5. Content Discovery
Implement a recommendation system based on user activity or preferences.

Introduce featured posts or highlights within categories to promote content.

6. Accessibility Improvements
Ensure your app is accessible, including text size options, voiceover compatibility, and high contrast modes.

Test the app's usability across different devices and screen sizes.

7. Performance Optimization
Optimize app performance and loading times, perhaps by refining data handling or incorporating more efficient querying and data retrieval techniques.

Consider implementing lazy loading for images and data.

8. Offline Support
Allow users to access content offline or save content to view later, which is especially useful for users with limited internet access.

9. Localization and Internationalization
If you're planning to reach a broader audience, consider localizing the app into different languages and formats suitable for various regions.

10. Integration with Other Services
Consider integrations with social media for sharing, maps for location-based services, or even third-party APIs that enhance the app’s functionality.

11. Security Enhancements
Regularly update security measures, ensure data protection compliance, and protect user data with encryption and secure authentication methods.

Next Steps:
User Feedback: Start gathering feedback on the current features and what users might want next.

Market Research: Look into what similar apps are doing, and see if there are industry-specific features that are expected but missing in your app.

Prototype and Test: For each new feature idea, prototype it, and conduct user testing sessions to gather early feedback.

Each of these features can help enhance the functionality, user engagement, and overall value of your app, turning it into a more comprehensive platform.

# 3-29
[High]  
Provide categories:
    Implement the dropdown for category selection in the PostScreen.tsx. 
    This allows you to structure the data with categories from the outset, which is easier than retrofitting data categorization later. (DONE)

    Enhance the HomeScreen to display categories for exisiting posts, which can be a quick upgrade to the user interface and immediately improve the user experience. (Done)
[Medium]
Develop Business Profiles:
    Once categories are in place and working smoothly, start designing and implementing the business profile feature. This includes setting up the different registration process, profile management capabilities, and the prioritization in feeds.

    Use the insights gained from the initial category implementation to tailor the business profile features, such as which categories are most popular and what specific needs businesses might have.

[Low]
Iterative Development and Feedback:
    Use feedback from users on the category implementation to refine and adjust the feature.
    Similarly, lauch a minimum viable product (MVP) for business profiles to select businesses and gather feedback to make iterative improvements before a full rollout.

# 3-17
[High] Update current IOS 17 SDK to 18 for IOS
[Low] Remove seconds from current time (Done)
[Medium] Set up posts to be removed after a week (included images attached Firebase Storage)

[High] Allow users to create study groups in their city
[Medium] Add a dark mode for better usability at night
[Low] Integrate AI chatbot to recommend local activities