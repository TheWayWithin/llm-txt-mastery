# Page snapshot

```yaml
- region "Notifications (F8)":
  - list
- region "Notifications alt+T"
- img "Page not found - confused but helpful robot with magnifying glass"
- img
- heading "Page Not Found" [level=3]
- paragraph: Oops! The page you're looking for seems to have wandered off. Let's help you find what you need.
- button "Try Again":
  - img
  - text: Try Again
- button "Go Home":
  - img
  - text: Go Home
- paragraph:
  - text: Looking for something specific? Try checking our
  - link "homepage":
    - /url: /
  - text: or
  - link "dashboard":
    - /url: /dashboard
- img "Cookie Icon"
- text: We use cookies to optimize your browsing experience for the purpose of personalizing and measuring the effectiveness of ads. By clicking "Allow All", you consent to our use of cookies.
- link "Privacy Policy ↗":
  - /url: ""
- button "Manage Cookies"
- button "Decline"
- button "Allow All"
- link "Dismiss Banner":
  - /url: "#"
```