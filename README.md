# Figma Bitcoin Price Update Script

> Automatically update Bitcoin prices in your Figma file using CoinGecko API data

This script fetches the current Bitcoin price from CoinGecko and updates a specific string variable ("Current") in your Figma file at configurable intervals.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node package manager)
- Figma personal access token
- Figma file key
- CoinGecko API access (free tier)

## Quick Start

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/figma-btc-price-update.git
    cd figma-btc-price-update
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure environment variables:
Create a `.env` file in the root directory:

    ```env
    PERSONAL_ACCESS_TOKEN=your_figma_personal_access_token
    FILE_KEY=your_figma_file_key
    ```

## Configuration

### Update Interval

Set how often the script fetches and updates the Bitcoin price by modifying `intervalInMinutes` in the script:

```javascript
const intervalInMinutes = 5;  // Default: 5 minutes
```

### Figma Setup Requirements

- Create a variable collection named "BTC"
- Add a string variable named "Current" within the collection

## Usage

Start the script:

```bash
node update-btc-price.js
```

The script will:

- Fetch the latest Bitcoin price from CoinGecko
- Update the "Current" variable in your Figma file
- Repeat this process at your configured interval
- Log all actions and responses for monitoring

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 400 Error | Ensure the variable isn't bound to a text node with a shared font |
| Update Failed | Verify your Figma token has edit access to the file |
| API Issues | Check the logs for detailed API responses |

### Logs

The script provides detailed logging for:

- Current variable value
- Figma API responses
- Update confirmations
- Any errors that occur

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
