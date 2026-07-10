# Security Policy

## Supported Versions

The following versions of this project are currently receiving security updates:

| Version | Supported          |
| ------- | ------------------ |
| latest (`main` branch) | ✅ Yes |
| older commits / forks  | ❌ No  |

## Reporting a Vulnerability

I take security vulnerabilities seriously. If you discover a security issue in this project, please **do not open a public GitHub issue**.

### How to Report

**Preferred method — GitHub Private Vulnerability Reporting:**  
Use the [Report a vulnerability](../../security/advisories/new) button on the Security tab of this repository. This keeps the disclosure private until a fix is available.

**Alternative — Email:**  
Send details directly to **[contact@abdheshsah.com.np](mailto:contact@abdheshsah.com.np)** with the subject line:  
`[SECURITY] Portfolio – <brief description>`

### What to Include

Please provide as much of the following as possible:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce the issue (proof-of-concept or reproduction script)
- The affected file(s) and line number(s) if known
- Any suggested mitigations or patches

### Response Timeline

| Action | Target SLA |
|--------|-----------|
| Acknowledgement of report | Within **48 hours** |
| Initial assessment / triage | Within **5 business days** |
| Fix released (for confirmed issues) | Within **30 days** (critical: 7 days) |
| Public disclosure | After fix is deployed and reporter is notified |

### Scope

Security reports are in scope for:
- **Backend API** (`Backend/`) — authentication, authorization, injection, SSRF, data exposure
- **Frontend** (`Frontend/`) — XSS, CSP bypasses, insecure storage
- **Shared package** (`packages/shared/`) — schema validation bypass, prototype pollution
- **CI/CD workflows** (`.github/workflows/`) — supply chain / workflow injection

Out of scope:
- Vulnerabilities in third-party dependencies already tracked by Dependabot
- Theoretical issues without a realistic attack scenario
- Social engineering or phishing attacks targeting the repository owner

### Safe Harbour

I will not pursue legal action against security researchers who:
- Report issues in good faith following this policy
- Do not access, modify, or exfiltrate data beyond what is needed to demonstrate the vulnerability
- Do not publicly disclose the issue until a fix has been released

Thank you for helping keep this project secure. 🙏
