# Figma Bitcoin Price Update Script

This script fetches the current Bitcoin price from CoinGecko and updates a specific string variable ("Current") in a Figma file with the latest BTC price. The update occurs at regular intervals (every x minutes, configurable).

Requirements
Before using the script, ensure you have the following installed:

Node.js (version 14 or higher)
npm (Node package manager)
You also need the following:

A Figma personal access token.
A Figma file key (the unique identifier of your Figma file).
A CoinGecko API endpoint (the script uses their free API to fetch the Bitcoin price).
Installation
Clone this repository or download the files:

bash
Copy
git clone <https://github.com/yourusername/figma-btc-price-update.git>
cd figma-btc-price-update
Install the required dependencies:

bash
Copy
npm install
Set up environment variables:

Create a .env file in the root directory.
Add the following content, replacing the placeholder values with your actual Figma token and file key:
dotenv
Copy
PERSONAL_ACCESS_TOKEN=your_figma_personal_access_token
FILE_KEY=your_figma_file_key
Install axios (used to make API requests):

bash
Copy
npm install axios
Configuration
Interval for BTC price update: The script will run every x minutes to fetch the Bitcoin price and update the Figma variable. You can configure the interval by changing the intervalInMinutes value in the script:

javascript
Copy
const intervalInMinutes = 5;  // Set the interval in minutes (default: 5 minutes)
Figma File: The script expects that there is a variable collection named BTC, and within it, a string variable named Current. This is where the Bitcoin price will be updated.

Usage

1. Run the script:
To start the script, simply run the following command in your terminal:

bash
Copy
node update-btc-price.js
The script will fetch the latest Bitcoin price from CoinGecko and attempt to update the Current variable in your Figma file.

2. Script execution interval:
The script will automatically repeat the update every x minutes (set by the intervalInMinutes variable). For example, with intervalInMinutes = 5, the script will fetch the Bitcoin price every 5 minutes.

3. Logging:
The script will log:

The current value of the variable before updating.
The API response from Figma after attempting to update the variable.
The updated value after the API response.
Troubleshooting
Error 400: If you see a 400 error when trying to update the variable, make sure the variable is not bound to a text node with a shared font, as this can prevent updates.

File Access: Ensure your Figma token has the correct permissions (edit access to the file) to update the variables.

Check Logs: If the script isn't working as expected, check the logs for detailed API responses to troubleshoot.

License
This project is licensed under the MIT License - see the LICENSE file for details.
