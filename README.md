# Figma Bitcoin Price Update Script

> Automatically update Bitcoin prices in your Figma files using GitHub Actions

## Features

- Update multiple Figma files with Bitcoin price data
- Configure different update intervals (5, 15, or 30 minutes)
- Web interface for managing configurations
- Secure storage of Figma tokens
- Automatic updates via GitHub Actions

## Setup

1. Fork this repository
2. Enable GitHub Pages in your fork's settings
3. Create a GitHub OAuth App:
   - Go to GitHub Developer Settings
   - Create a new OAuth App
   - Set homepage URL to your GitHub Pages URL
   - Set callback URL to the same
4. Update the following in docs/index.html:
   - GITHUB_CLIENT_ID
   - REPO_OWNER
   - REPO_NAME

## Usage

1. Visit your GitHub Pages URL
2. Login with GitHub
3. Add new configurations:
   - Enter Figma file details
   - Choose update interval
   - Save configuration

## Configuration Options

Each configuration includes:
- Figma file key
- Figma access token
- Collection name
- Update interval (5, 15, or 30 minutes)
- Enabled/disabled status

## Security

- Figma tokens are stored in the repository
- Access is controlled via GitHub authentication
- Only repository owners can manage configurations

## Troubleshooting

See the Actions tab for execution logs and errors.
